import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Approve a document → create transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, action, edits } = body;

    if (!documentId || !action) {
      return NextResponse.json({ error: "Missing documentId or action" }, { status: 400 });
    }

    // Get the document
    const { data: doc, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (action === "approve" || action === "correct") {
      // If correcting, update the document first
      const updatedFields = action === "correct" && edits ? {
        vendor_name: edits.vendor_name || doc.vendor_name,
        amount: edits.amount || doc.amount,
        date: edits.date || doc.date,
        description: edits.description || doc.description,
        category_id: edits.category_id || doc.category_id,
        category_name: edits.category_name || doc.category_name,
        transaction_type: edits.transaction_type || doc.transaction_type,
      } : {};

      // Update document status
      await supabaseAdmin
        .from("documents")
        .update({
          ...updatedFields,
          review_status: action === "correct" ? "corrected" : "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      // Create transaction
      const txData = {
        business_id: doc.business_id,
        user_id: doc.user_id,
        document_id: doc.id,
        vendor_name: edits?.vendor_name || doc.vendor_name,
        amount: edits?.amount || doc.amount,
        date: edits?.date || doc.date,
        description: edits?.description || doc.description,
        category_id: edits?.category_id || doc.category_id,
        category_name: edits?.category_name || doc.category_name,
        transaction_type: edits?.transaction_type || doc.transaction_type,
        source: "upload" as const,
      };

      const { data: tx } = await supabaseAdmin
        .from("transactions")
        .insert(txData)
        .select()
        .single();

      // If corrected, check if we should create/update a rule
      if (action === "correct" && edits?.vendor_name) {
        const normalizedVendor = edits.vendor_name.toLowerCase().trim();

        // Check if vendor has been corrected 3+ times to same category
        const { count } = await supabaseAdmin
          .from("transactions")
          .select("id", { count: "exact" })
          .eq("business_id", doc.business_id)
          .ilike("vendor_name", `%${normalizedVendor}%`)
          .eq("category_id", edits.category_id || doc.category_id);

        if (count && count >= 3) {
          // Auto-create a rule
          await supabaseAdmin.from("categorization_rules").upsert({
            business_id: doc.business_id,
            vendor_pattern: normalizedVendor,
            category_id: edits.category_id || doc.category_id,
            transaction_type: edits.transaction_type || doc.transaction_type,
            source: "ai_learned",
            is_active: true,
          }, { onConflict: "business_id,vendor_pattern" });
        }
      }

      return NextResponse.json({ success: true, transaction: tx });
    }

    if (action === "reject") {
      await supabaseAdmin
        .from("documents")
        .update({ review_status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", documentId);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Review error:", err);
    const message = err instanceof Error ? err.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
