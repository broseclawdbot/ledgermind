import Link from "next/link";
import { BookOpen, Upload, Sparkles, BarChart3, ArrowRight, Check, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">LedgerMind</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-primary text-sm">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          AI-Powered Bookkeeping
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Upload receipts.
          <br />
          <span className="text-brand-600">AI does the rest.</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
          LedgerMind reads your financial documents, auto-categorizes every transaction,
          and gives you instant P&L reports. Built for owners running multiple businesses.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register" className="btn-primary text-base px-8 py-3">
            Start 14-Day Free Trial <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
          <p className="text-sm text-gray-500">No credit card required</p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Three steps. Five minutes. Done.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: "1. Upload anything",
                desc: "Drop receipt photos, bank statement PDFs, or CSV exports. We handle every format.",
              },
              {
                icon: Sparkles,
                title: "2. AI categorizes",
                desc: "Our AI reads each document, extracts the data, and categorizes it to the right account. You approve or edit.",
              },
              {
                icon: BarChart3,
                title: "3. See your numbers",
                desc: "Instant P&L reports, expense breakdowns, and dashboards across all your businesses. Export to PDF.",
              },
            ].map((step) => (
              <div key={step.title} className="text-center">
                <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-7 h-7 text-brand-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Built for multi-business owners
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              "Upload receipts, invoices, bank statements, or CSVs",
              "AI reads and categorizes every transaction",
              "Manage multiple businesses from one dashboard",
              "Auto-categorization rules that learn from your corrections",
              "Profit & Loss reports with drill-down",
              "Export everything to PDF for your accountant",
              "Review queue with confidence scores — you stay in control",
              "Bank-grade encryption for all financial data",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple pricing</h2>
          <p className="text-gray-600 mb-10">Start free. Upgrade when you&apos;re ready.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900">Starter</h3>
              <p className="text-3xl font-bold text-gray-900 my-2">$29<span className="text-base font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-500">1 business, 50 uploads/month</p>
            </div>
            <div className="card p-6 ring-2 ring-brand-500">
              <h3 className="text-lg font-semibold text-brand-700">Pro</h3>
              <p className="text-3xl font-bold text-gray-900 my-2">$49<span className="text-base font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-500">3 businesses, 250 uploads/month, all reports</p>
            </div>
          </div>
          <Link href="/auth/register" className="btn-primary mt-8 inline-flex text-base px-8 py-3">
            Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span>LedgerMind</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            256-bit encryption &middot; Your data is yours
          </div>
        </div>
      </footer>
    </div>
  );
}
