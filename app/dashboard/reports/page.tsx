"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-browser";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, Download, FileText, Loader2 } from "lucide-react";

interface CategoryTotal {
  category_name: string;
  total: number;
  count: number;
  type: string;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryTotal[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryTotal[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadReport();
  }, [dateFrom, dateTo]);

  async function loadReport() {
    setLoading(true);
    const businessId = localStorage.getItem("ledgermind_active_business");
    if (!businessId) return;

    const { data: transactions } = await supabase
      .from("transactions")
      .select("amount, transaction_type, category_name")
      .eq("business_id", businessId)
      .gte("date", dateFrom)
      .lte("date", dateTo);

    if (!transactions) {
      setLoading(false);
      return;
    }

    // Aggregate by category
    const catMap: Record<string, CategoryTotal> = {};
    let incTotal = 0;
    let expTotal = 0;

    for (const tx of transactions) {
      const key = `${tx.transaction_type}:${tx.category_name || "Uncategorized"}`;
      if (!catMap[key]) {
        catMap[key] = { category_name: tx.category_name || "Uncategorized", total: 0, count: 0, type: tx.transaction_type };
      }
      catMap[key].total += Math.abs(Number(tx.amount));
      catMap[key].count += 1;

      if (tx.transaction_type === "income") incTotal += Math.abs(Number(tx.amount));
      else if (tx.transaction_type === "expense") expTotal += Math.abs(Number(tx.amount));
    }

    const cats = Object.values(catMap);
    setIncomeCategories(cats.filter((c) => c.type === "income").sort((a, b) => b.total - a.total));
    setExpenseCategories(cats.filter((c) => c.type === "expense").sort((a, b) => b.total - a.total));
    setTotalIncome(incTotal);
    setTotalExpenses(expTotal);
    setLoading(false);
  }

  async function exportPDF() {
    const { jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF();
    const netProfit = totalIncome - totalExpenses;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(27, 79, 114);
    doc.text("LedgerMind", 14, 20);

    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text("Profit & Loss Report", 14, 32);

    doc.setFontSize(10);
    doc.setTextColor(127, 140, 141);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 40);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 46);

    // Summary Box
    doc.setFillColor(235, 245, 251);
    doc.rect(14, 52, 182, 24, "F");
    doc.setFontSize(11);
    doc.setTextColor(44, 62, 80);
    doc.text(`Total Income: ${formatCurrency(totalIncome)}`, 20, 62);
    doc.text(`Total Expenses: ${formatCurrency(totalExpenses)}`, 80, 62);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Net Profit: ${formatCurrency(netProfit)}`, 145, 62);
    doc.setFont("helvetica", "normal");

    let yPos = 86;

    // Income section
    if (incomeCategories.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(39, 174, 96);
      doc.text("INCOME", 14, yPos);
      yPos += 4;

      (doc as any).autoTable({
        startY: yPos,
        head: [["Category", "Amount", "# Transactions"]],
        body: incomeCategories.map((c) => [c.category_name, formatCurrency(c.total), c.count.toString()]),
        foot: [["Total Income", formatCurrency(totalIncome), ""]],
        theme: "grid",
        headStyles: { fillColor: [39, 174, 96], fontSize: 9 },
        footStyles: { fillColor: [235, 245, 251], textColor: [44, 62, 80], fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // Expenses section
    if (expenseCategories.length > 0) {
      doc.setFontSize(13);
      doc.setTextColor(231, 76, 60);
      doc.text("EXPENSES", 14, yPos);
      yPos += 4;

      (doc as any).autoTable({
        startY: yPos,
        head: [["Category", "Amount", "# Transactions"]],
        body: expenseCategories.map((c) => [c.category_name, formatCurrency(c.total), c.count.toString()]),
        foot: [["Total Expenses", formatCurrency(totalExpenses), ""]],
        theme: "grid",
        headStyles: { fillColor: [231, 76, 60], fontSize: 9 },
        footStyles: { fillColor: [235, 245, 251], textColor: [44, 62, 80], fontStyle: "bold" },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 12;
    }

    // Net Profit
    doc.setFillColor(27, 79, 114);
    doc.rect(14, yPos, 182, 12, "F");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`NET PROFIT: ${formatCurrency(netProfit)}`, 20, yPos + 8);
    doc.setFont("helvetica", "normal");

    doc.save(`LedgerMind_PnL_${dateFrom}_to_${dateTo}.pdf`);
  }

  const netProfit = totalIncome - totalExpenses;
  const maxExpense = expenseCategories[0]?.total || 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit & Loss Report</h1>
          <p className="text-gray-500 mt-1">Financial performance for the selected period</p>
        </div>
        <button onClick={exportPDF} className="btn-primary">
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </button>
      </div>

      {/* Date Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From:</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To:</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input w-auto" />
        </div>
        <div className="flex gap-2 ml-auto">
          {[
            { label: "This Month", fn: () => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]); setDateTo(d.toISOString().split("T")[0]); }},
            { label: "This Quarter", fn: () => { const d = new Date(); const q = Math.floor(d.getMonth() / 3) * 3; setDateFrom(new Date(d.getFullYear(), q, 1).toISOString().split("T")[0]); setDateTo(d.toISOString().split("T")[0]); }},
            { label: "This Year", fn: () => { const d = new Date(); setDateFrom(new Date(d.getFullYear(), 0, 1).toISOString().split("T")[0]); setDateTo(d.toISOString().split("T")[0]); }},
          ].map((preset) => (
            <button key={preset.label} onClick={preset.fn} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5">
              <p className="text-sm text-gray-500">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(netProfit)}
              </p>
            </div>
          </div>

          {/* Income Breakdown */}
          {incomeCategories.length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Income</h2>
                <span className="text-green-600 font-semibold">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {incomeCategories.map((cat) => (
                  <div key={cat.category_name} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{cat.category_name}</p>
                      <p className="text-xs text-gray-500">{cat.count} transaction{cat.count !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(cat.total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense Breakdown with bars */}
          {expenseCategories.length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
                <span className="text-red-600 font-semibold">{formatCurrency(totalExpenses)}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {expenseCategories.map((cat) => (
                  <div key={cat.category_name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cat.category_name}</p>
                        <p className="text-xs text-gray-500">{cat.count} transaction{cat.count !== 1 ? "s" : ""}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(cat.total)}</p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-brand-400 h-2 rounded-full transition-all"
                        style={{ width: `${(cat.total / maxExpense) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {incomeCategories.length === 0 && expenseCategories.length === 0 && (
            <div className="card p-12 text-center">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">No transactions found</h2>
              <p className="text-gray-500">Upload and approve some documents to see your P&L report.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
