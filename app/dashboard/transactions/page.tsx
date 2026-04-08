"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Receipt, ArrowUpRight, ArrowDownRight, Loader2, Plus, Search } from "lucide-react";
import type { Transaction } from "@/types/database";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    loadTransactions();
  }, [typeFilter]);

  async function loadTransactions() {
    setLoading(true);
    const businessId = localStorage.getItem("ledgermind_active_business");
    if (!businessId) return;

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: false })
      .limit(100);

    if (typeFilter !== "all") {
      query = query.eq("transaction_type", typeFilter);
    }

    const { data } = await query;
    setTransactions(data || []);
    setLoading(false);
  }

  const filtered = search
    ? transactions.filter((tx) =>
        (tx.vendor_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (tx.description || "").toLowerCase().includes(search.toLowerCase()) ||
        (tx.category_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  const totalIncome = filtered.filter((t) => t.transaction_type === "income").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalExpenses = filtered.filter((t) => t.transaction_type === "expense").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor, description, or category..."
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {["all", "income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t ? "bg-white shadow text-gray-900" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t === "all" ? "All" : t === "income" ? "Income" : "Expenses"}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-500">
          {formatCurrency(totalIncome)} in &middot; {formatCurrency(totalExpenses)} out
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h2>
          <p className="text-gray-500">Upload and approve documents to see transactions here.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Vendor</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Category</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Source</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(tx.date)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        tx.transaction_type === "income" ? "bg-green-50" : "bg-red-50"
                      }`}>
                        {tx.transaction_type === "income"
                          ? <ArrowUpRight className="w-3 h-3 text-green-600" />
                          : <ArrowDownRight className="w-3 h-3 text-red-600" />
                        }
                      </div>
                      <span className="text-sm font-medium text-gray-900">{tx.vendor_name || "Unknown"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{tx.category_name || "Uncategorized"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tx.source === "upload" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {tx.source}
                    </span>
                  </td>
                  <td className={`px-5 py-3.5 text-sm font-semibold text-right ${
                    tx.transaction_type === "income" ? "text-green-600" : "text-gray-900"
                  }`}>
                    {tx.transaction_type === "income" ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
