"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle,
  ArrowUpRight, ArrowDownRight, Upload, ClipboardCheck
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingReview: number;
  recentTransactions: Array<{
    id: string;
    vendor_name: string;
    amount: number;
    date: string;
    transaction_type: string;
    category_name: string;
  }>;
}

export function DashboardContent({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const stored = localStorage.getItem("ledgermind_active_business");
    if (stored) {
      setBusinessId(stored);
      loadStats(stored);
    } else {
      // Load first business
      supabase
        .from("businesses")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) {
            setBusinessId(data.id);
            localStorage.setItem("ledgermind_active_business", data.id);
            loadStats(data.id);
          }
        });
    }
  }, [userId]);

  async function loadStats(bizId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const [incomeRes, expenseRes, pendingRes, recentRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("amount")
        .eq("business_id", bizId)
        .eq("transaction_type", "income")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth),
      supabase
        .from("transactions")
        .select("amount")
        .eq("business_id", bizId)
        .eq("transaction_type", "expense")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth),
      supabase
        .from("documents")
        .select("id", { count: "exact" })
        .eq("business_id", bizId)
        .eq("review_status", "pending"),
      supabase
        .from("transactions")
        .select("id, vendor_name, amount, date, transaction_type, category_name")
        .eq("business_id", bizId)
        .order("date", { ascending: false })
        .limit(8),
    ]);

    const totalIncome = (incomeRes.data || []).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = (expenseRes.data || []).reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      pendingReview: pendingRes.count || 0,
      recentTransactions: recentRes.data || [],
    });
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  const kpis = [
    { label: "Income (This Month)", value: formatCurrency(stats.totalIncome), icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Expenses (This Month)", value: formatCurrency(stats.totalExpenses), icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
    { label: "Net Profit", value: formatCurrency(stats.netProfit), icon: DollarSign, color: stats.netProfit >= 0 ? "text-green-600" : "text-red-600", bg: stats.netProfit >= 0 ? "bg-green-50" : "bg-red-50" },
    { label: "Needs Review", value: stats.pendingReview.toString(), icon: AlertCircle, color: stats.pendingReview > 0 ? "text-amber-600" : "text-gray-400", bg: stats.pendingReview > 0 ? "bg-amber-50" : "bg-gray-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link href="/dashboard/upload" className="btn-primary">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Link>
          {stats.pendingReview > 0 && (
            <Link href="/dashboard/review" className="btn-secondary">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Review ({stats.pendingReview})
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">{kpi.label}</span>
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        {stats.recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-2">No transactions yet.</p>
            <p className="text-sm">Upload your first document to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentTransactions.map((tx) => (
              <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.transaction_type === "income" ? "bg-green-50" : "bg-red-50"
                  }`}>
                    {tx.transaction_type === "income"
                      ? <ArrowUpRight className="w-4 h-4 text-green-600" />
                      : <ArrowDownRight className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.vendor_name || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{tx.category_name || "Uncategorized"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${
                    tx.transaction_type === "income" ? "text-green-600" : "text-gray-900"
                  }`}>
                    {tx.transaction_type === "income" ? "+" : "-"}{formatCurrency(Math.abs(Number(tx.amount)))}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
