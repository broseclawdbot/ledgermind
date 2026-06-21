"use client";

import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LedgerMind</span>
          </Link>
          <Link href="/" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: June 21, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed">
              LedgerMind (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered bookkeeping platform, including our website, application, and related services (collectively, the &quot;Service&quot;).
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              By accessing or using the Service, you agree to this Privacy Policy. If you do not agree with the terms of this policy, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">2.1 Personal Information</h3>
            <p className="text-gray-700 leading-relaxed">
              When you register for an account, we collect your full name, email address, and password. If you sign in through a third-party provider such as Google, we receive your name, email address, and profile picture from that provider.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">2.2 Financial Data</h3>
            <p className="text-gray-700 leading-relaxed">
              When you connect your QuickBooks account or upload financial documents, we access and store transaction data, account balances, vendor and customer information, invoices, receipts, and other financial records necessary to provide our bookkeeping services. This data is processed securely and used solely for the purpose of delivering our Service to you.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mt-4 mb-2">2.3 Usage Data</h3>
            <p className="text-gray-700 leading-relaxed">
              We automatically collect information about how you interact with the Service, including your IP address, browser type, operating system, pages viewed, features used, and timestamps. This helps us improve the Service and diagnose technical issues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed">
              We use the information we collect to provide, maintain, and improve our AI-powered bookkeeping Service; to process and categorize your financial transactions automatically; to generate profit-and-loss reports, financial summaries, and insights; to communicate with you about your account, updates, and support inquiries; to detect, prevent, and address fraud, security issues, and technical problems; and to comply with legal obligations and enforce our Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. QuickBooks Integration</h2>
            <p className="text-gray-700 leading-relaxed">
              When you connect your QuickBooks account through Intuit&apos;s OAuth 2.0 authorization flow, we request access to read your financial data. We only access the data necessary to provide our Service. You can revoke LedgerMind&apos;s access to your QuickBooks account at any time through your Intuit account settings or through our application. We do not store your QuickBooks login credentials â authentication is handled entirely by Intuit&apos;s secure OAuth system.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Storage and Security</h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is stored securely using industry-standard encryption. We use Supabase as our database provider, which employs encryption at rest and in transit, row-level security policies, and regular security audits. While we implement commercially reasonable security measures, no electronic transmission or storage method is 100% secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating the Service (such as hosting and infrastructure providers), but only to the extent necessary for them to perform their services. We may also disclose your information if required by law, court order, or governmental regulation, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. AI and Automated Processing</h2>
            <p className="text-gray-700 leading-relaxed">
              LedgerMind uses artificial intelligence to automatically categorize transactions, extract data from receipts, and generate financial reports. These AI processes operate on your data solely within our secure infrastructure. We do not use your financial data to train general-purpose AI models. Your data is processed only to deliver personalized bookkeeping insights and reports to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
            <p className="text-gray-700 leading-relaxed">
              You have the right to access, correct, or delete your personal data at any time. You may export your data from the Service, request a copy of all personal information we hold about you, or delete your account entirely. To exercise any of these rights, contact us at support@ledgermind.app. We will respond to your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              We use essential cookies to maintain your authentication session and remember your preferences. We do not use third-party advertising or tracking cookies. You can manage cookie settings through your browser, though disabling essential cookies may prevent the Service from functioning properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Children&apos;s Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              The Service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child without parental consent, we will take steps to delete that information promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions or concerns about this Privacy Policy, please contact us at support@ledgermind.app.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-brand-600">Terms of Service</Link>
          <Link href="/" className="hover:text-brand-600">Home</Link>
        </div>
      </main>
    </div>
  );
}
