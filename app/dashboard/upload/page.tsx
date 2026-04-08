"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency, confidenceColor } from "@/lib/utils";
import {
  Upload, FileText, Image, Table, CheckCircle2, XCircle,
  Loader2, AlertTriangle, ArrowRight
} from "lucide-react";
import Link from "next/link";

interface ProcessedDoc {
  id: string;
  file_name: string;
  vendor_name: string | null;
  amount: number | null;
  date: string | null;
  category_name: string | null;
  confidence: number;
  reviewStatus: string;
  status: "uploading" | "processing" | "done" | "error";
  error?: string;
}

export default function UploadPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [docs, setDocs] = useState<ProcessedDoc[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const stored = localStorage.getItem("ledgermind_active_business");
    setBusinessId(stored);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!businessId || !userId) return;

    const docId = Math.random().toString(36).slice(2);
    const newDoc: ProcessedDoc = {
      id: docId,
      file_name: file.name,
      vendor_name: null,
      amount: null,
      date: null,
      category_name: null,
      confidence: 0,
      reviewStatus: "pending",
      status: "uploading",
    };

    setDocs((prev) => [...prev, newDoc]);

    // Update to processing
    setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: "processing" } : d));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessId", businessId);
      formData.append("userId", userId);

      const res = await fetch("/api/process-document", { method: "POST", body: formData });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Processing failed");

      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                id: result.document?.id || docId,
                vendor_name: result.document?.vendor_name,
                amount: result.document?.amount,
                date: result.document?.date,
                category_name: result.document?.category_name,
                confidence: result.confidence || 0,
                reviewStatus: result.reviewStatus,
                status: "done",
              }
            : d
        )
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, status: "error", error: message } : d));
    }
  }, [businessId, userId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(processFile);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"],
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  if (!businessId) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Please select a business from the top bar first.</p>
      </div>
    );
  }

  const pendingCount = docs.filter((d) => d.reviewStatus === "pending" && d.status === "done").length;
  const autoApprovedCount = docs.filter((d) => d.reviewStatus === "auto_approved").length;

  const fileIcon = (name: string) => {
    if (name.match(/\.(png|jpg|jpeg|webp)$/i)) return <Image className="w-5 h-5 text-purple-500" />;
    if (name.match(/\.pdf$/i)) return <FileText className="w-5 h-5 text-red-500" />;
    if (name.match(/\.(csv|xlsx)$/i)) return <Table className="w-5 h-5 text-green-600" />;
    return <FileText className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Documents</h1>
          <p className="text-gray-500 mt-1">
            Drop receipts, invoices, bank statements, or CSVs. AI reads and categorizes everything.
          </p>
        </div>
        {pendingCount > 0 && (
          <Link href="/dashboard/review" className="btn-primary">
            Review {pendingCount} items <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        )}
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`card p-12 border-2 border-dashed cursor-pointer transition-colors text-center ${
          isDragActive
            ? "border-brand-400 bg-brand-50"
            : "border-gray-300 hover:border-brand-300 hover:bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? "text-brand-500" : "text-gray-400"}`} />
        <p className="text-lg font-medium text-gray-700">
          {isDragActive ? "Drop files here..." : "Drag & drop files here"}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          or click to browse. Supports PDF, images (JPG/PNG), CSV, and XLSX. Max 20MB per file.
        </p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <span className="flex items-center gap-1 text-xs text-gray-400"><Image className="w-3.5 h-3.5" /> Photos</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><FileText className="w-3.5 h-3.5" /> PDFs</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Table className="w-3.5 h-3.5" /> Spreadsheets</span>
        </div>
      </div>

      {/* Summary Badges */}
      {docs.length > 0 && (
        <div className="flex gap-3">
          <span className="text-sm text-gray-500">{docs.length} file(s) uploaded</span>
          {autoApprovedCount > 0 && (
            <span className="text-sm text-green-600 font-medium">{autoApprovedCount} auto-approved</span>
          )}
          {pendingCount > 0 && (
            <span className="text-sm text-amber-600 font-medium">{pendingCount} needs review</span>
          )}
        </div>
      )}

      {/* Results Table */}
      {docs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <div key={doc.id} className="px-5 py-4 flex items-center gap-4">
                {/* File icon */}
                <div className="flex-shrink-0">{fileIcon(doc.file_name)}</div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.file_name}</p>
                  {doc.status === "done" && (
                    <p className="text-xs text-gray-500">
                      {doc.vendor_name || "Unknown vendor"} &middot; {doc.date || "No date"} &middot; {doc.category_name || "Uncategorized"}
                    </p>
                  )}
                  {doc.status === "error" && (
                    <p className="text-xs text-red-500">{doc.error}</p>
                  )}
                </div>

                {/* Amount */}
                <div className="text-right">
                  {doc.status === "done" && doc.amount ? (
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(doc.amount)}</p>
                  ) : null}
                </div>

                {/* Confidence */}
                {doc.status === "done" && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor(doc.confidence)}`}>
                    {Math.round(doc.confidence)}%
                  </span>
                )}

                {/* Status */}
                <div className="flex-shrink-0">
                  {doc.status === "uploading" && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                  {doc.status === "processing" && <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />}
                  {doc.status === "done" && doc.reviewStatus === "auto_approved" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {doc.status === "done" && doc.reviewStatus === "pending" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                  {doc.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
