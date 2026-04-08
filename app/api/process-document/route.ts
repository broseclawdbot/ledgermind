import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── OCR via Google Cloud Vision ────────────────────────────────
async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  // If Google Vision is configured, use it
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const vision = require("@google-cloud/vision");
      const client = new vision.ImageAnnotatorClient();
      const [result] = await client.textDetection({ image: { content: imageBuffer.toString("base64") } });
      const text = result.textAnnotations?.[0]?.description || "";
      return text;
    } catch (err) {
      console.error("Google Vision failed, falling back to Claude Vision:", err);
    }
  }

  // Fallback: use Claude's vision capability for OCR
  const base64 = imageBuffer.toString("base64");
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: base64 },
          },
          {
            type: "text",
            text: "Extract ALL text from this financial document/receipt. Return the raw text exactly as it appears. Include all numbers, dates, vendor names, amounts, and line items.",
          },
        ],
      },
    ],
  });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

// ─── AI Extraction + Categorization ─────────────────────────────
async function extractAndCategorize(
  text: string,
  categories: Array<{ id: string; name: string; type: string }>,
  existingRules: Array<{ vendor_pattern: string; category_id: string; transaction_type: string }>
) {
  // Stage 1: Check rules first
  const textLower = text.toLowerCase();
  for (const rule of existingRules) {
    if (textLower.includes(rule.vendor_pattern.toLowerCase())) {
      const cat = categories.find((c) => c.id === rule.category_id);
      return {
        ruleMatched: true,
        ruleCategory: cat?.name || "Unknown",
        ruleCategoryId: rule.category_id,
        ruleType: rule.transaction_type,
      };
    }
  }

  // Stage 2 + 3: Use Claude for extraction and categorization
  const categoryList = categories
    .map((c) => `- ${c.name} (${c.type}) [id: ${c.id}]`)
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You are an expert bookkeeper. Analyze this financial document text and extract structured data.

DOCUMENT TEXT:
---
${text}
---

AVAILABLE CATEGORIES:
${categoryList}

Return a JSON object (no markdown, just raw JSON):
{
  "vendor_name": "string - the vendor/merchant/payee name",
  "amount": number - the total amount (positive number),
  "date": "YYYY-MM-DD - the transaction date",
  "description": "string - brief description of the transaction",
  "transaction_type": "income" | "expense",
  "category_id": "string - the best matching category ID from the list above",
  "category_name": "string - the category name",
  "confidence": number (0-100),
  "reasoning": "string - brief explanation of why this category was chosen"
}`,
      },
    ],
  });

  const block = response.content[0];
  const rawText = block.type === "text" ? block.text : "{}";

  try {
    // Try to parse JSON, handling potential markdown wrapper
    const jsonStr = rawText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return { ruleMatched: false, ...JSON.parse(jsonStr) };
  } catch {
    return {
      ruleMatched: false,
      vendor_name: "Unknown",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "Could not parse document",
      transaction_type: "expense",
      category_name: "Other Expenses",
      confidence: 0,
      reasoning: "Failed to parse AI response",
    };
  }
}

// ─── Main handler ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const businessId = formData.get("businessId") as string;
    const userId = formData.get("userId") as string;

    if (!file || !businessId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Upload file to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${userId}/${businessId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("uploads")
      .upload(storagePath, fileBuffer, { contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: "Upload failed: " + uploadError.message }, { status: 500 });
    }

    // 2. Create upload record
    const { data: upload, error: dbError } = await supabaseAdmin
      .from("uploads")
      .insert({
        business_id: businessId,
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        status: "processing",
      })
      .select()
      .single();

    if (dbError || !upload) {
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    // 3. Extract text (OCR for images, direct for other types)
    let extractedText = "";

    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      extractedText = await extractTextFromImage(fileBuffer);
    } else if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      extractedText = fileBuffer.toString("utf-8");
    } else {
      extractedText = fileBuffer.toString("utf-8");
    }

    // 4. Load categories and rules for this business
    const [catRes, ruleRes] = await Promise.all([
      supabaseAdmin.from("categories").select("id, name, type").eq("business_id", businessId),
      supabaseAdmin.from("categorization_rules").select("vendor_pattern, category_id, transaction_type").eq("business_id", businessId).eq("is_active", true),
    ]);

    // 5. AI extraction + categorization
    const result = await extractAndCategorize(
      extractedText,
      catRes.data || [],
      ruleRes.data || []
    );

    // 6. Determine review status
    const confidence = result.ruleMatched ? 98 : (result.confidence || 0);
    const autoApproveThreshold = 90;
    const reviewStatus = confidence >= autoApproveThreshold ? "auto_approved" : "pending";

    // 7. Resolve category ID
    let categoryId = result.ruleMatched ? result.ruleCategoryId : result.category_id;
    if (!categoryId && catRes.data) {
      const match = catRes.data.find((c) => c.name === (result.category_name || "Other Expenses"));
      categoryId = match?.id || null;
    }

    // 8. Create document record
    const { data: doc } = await supabaseAdmin
      .from("documents")
      .insert({
        upload_id: upload.id,
        business_id: businessId,
        user_id: userId,
        vendor_name: result.ruleMatched ? result.vendor_pattern : result.vendor_name,
        amount: result.amount || 0,
        date: result.date || new Date().toISOString().split("T")[0],
        description: result.description || file.name,
        category_id: categoryId,
        category_name: result.ruleMatched ? result.ruleCategory : result.category_name,
        transaction_type: result.ruleMatched ? result.ruleType : (result.transaction_type || "expense"),
        ai_confidence: confidence,
        ai_reasoning: result.ruleMatched ? "Matched existing categorization rule" : result.reasoning,
        extracted_data: { raw_text: extractedText.substring(0, 5000), full_result: result },
        review_status: reviewStatus,
      })
      .select()
      .single();

    // 9. If auto-approved, create transaction immediately
    if (reviewStatus === "auto_approved" && doc) {
      await supabaseAdmin.from("transactions").insert({
        business_id: businessId,
        user_id: userId,
        document_id: doc.id,
        vendor_name: doc.vendor_name,
        amount: doc.amount,
        date: doc.date,
        description: doc.description,
        category_id: doc.category_id,
        category_name: doc.category_name,
        transaction_type: doc.transaction_type,
        source: "upload",
      });
    }

    // 10. Update upload status
    await supabaseAdmin
      .from("uploads")
      .update({ status: "completed" })
      .eq("id", upload.id);

    return NextResponse.json({
      success: true,
      document: doc,
      reviewStatus,
      confidence,
    });
  } catch (err: unknown) {
    console.error("Process document error:", err);
    const message = err instanceof Error ? err.message : "Processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
