"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency, formatDate, confidenceColor } from "@/lib/utils";
import {
  CheckCircle2, XCircle, Edit3, Loader2, ChevronDown,
  AlertTriangle, Sparkles, ArrowLeft
} from "lucide-react";
import Link from "next/link";
import type { Document, Category } from "@/types/database";

export default function ReviewPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const businessId = localStorage.getItem("ledgermind_active_business");
    if (!businessId) return;

    const [docsRes, catsRes] = await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .eq("business_id", businessId)
        .eq("review_status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("categories")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order"),
    ]);

    setDocuments(docsRes.data || []);
    setCategories(catsRes.data || []);
    setLoading(false);
  }

  async function handleAction(docId: string, action: "approve" | "reject" | "correct") {
    setProcessingId(docId);

    const body: Record<string, unknown> = { documentId: docId, action };
    if (action === "correct") {
      body.edits = editForm;
    }

    const res = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setEditingId(null);
      setEditForm({});
    }

    setProcessingId(null);
  }

  function startEditing(doc: Document) {
    setEditingId(doc.id);
    setEditForm({
      vendor_name: doc.vendor_name || "",
      amount: doc.amount || 0,
      date: doc.date || "",
      description: doc.description || "",
      category_id: doc.category_id || "",
      category_name: doc.category_name || "",
      transaction_type: doc.transaction_type,
    });
  }

  async function approveAll() {
    const highConfidence = documents.filter((d) => d.ai_confidence >= 85);
    for (const doc of highConfidence) {
      await handleAction(doc.id, "approve");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const highConfidenceCount = documents.filter((d) => d.ai_confidence >= 85).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
          <p className="text-gray-500 mt-1">
            {documents.length} item{documents.length !== 1 ? "s" : ""} waiting for your review
          </p>
        </div>
        <div className="flex gap-3">
          {highConfidenceCount > 0 && (
            <button onClick={approveAll} className="btn-primary">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve All High Confidence ({highConfidenceCount})
            </button>
          )}
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h2>
          <p className="text-gray-500 mb-6">No items need review right now.</p>
          <Link href="/dashboard/upload" className="btn-secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Upload More Documents
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const isEditing = editingId === doc.id;
            const isProcessing = processingId === doc.id;

            return (
              <div key={doc.id} className="card overflow-hidden">
                <div className="p-5">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-brand-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          AI Extracted from upload
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${confidenceColor(doc.ai_confidence)}`}>
                      {Math.round(doc.ai_confidence)}% confidence
                    </span>
                  </div>

                  {/* Data Fields */}
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="label">Vendor</label>
                        <input
                          className="input"
                          value={editForm.vendor_name as string}
                          onChange={(e) => setEditForm({ ...editForm, vendor_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          className="input"
                          value={editForm.amount}
                          onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="label">Date</label>
                        <input
                          type="date"
                          className="input"
                          value={editForm.date as string}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label">Category</label>
                        <select
                          className="input"
                          value={editForm.category_id as string}
                          onChange={(e) => {
                            const cat = categories.find((c) => c.id === e.target.value);
                            setEditForm({
                              ...editForm,
                              category_id: e.target.value,
                              category_name: cat?.name || "",
                              transaction_type: cat?.type || "expense",
                            });
                          }}
                        >
                          <option value="">Select category...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name} ({cat.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="label">Description</label>
                        <input
                          className="input"
                          value={editForm.description as string}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Vendor</p>
                        <p className="text-sm font-medium text-gray-900">{doc.vendor_name || "Unknown"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {doc.amount ? formatCurrency(Number(doc.amount)) : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Date</p>
                        <p className="text-sm text-gray-900">{doc.date ? formatDate(doc.date) : "No date"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Category</p>
                        <p className="text-sm text-gray-900">{doc.category_name || "Uncategorized"}</p>
                      </div>
                    </div>
                  )}

                  {/* AI Reasoning */}
                  {doc.ai_reasoning && (
                    <div className="bg-brand-50 rounded-lg px-4 py-2.5 mb-4">
                      <p className="text-xs text-brand-700">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        <strong>AI reasoning:</strong> {doc.ai_reasoning}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleAction(doc.id, "correct")}
                          disabled={isProcessing}
                          className="btn-primary"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                          Save & Approve
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn-ghost">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAction(doc.id, "approve")}
                          disabled={isProcessing}
                          className="btn-primary"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                          Approve
                        </button>
                        <button onClick={() => startEditing(doc)} className="btn-secondary">
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleAction(doc.id, "reject")}
                          disabled={isProcessing}
                          className="btn-ghost text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
