"use client";

import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: June 21, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using LedgerMind (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. These Terms constitute a legally binding agreement between you and LedgerMind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed">
              LedgerMind is an AI-powered bookkeeping platform that helps business owners manage their finances by automatically categorizing transactions, extracting data from receipts and financial documents, generating profit-and-loss reports, and integrating with accounting software such as QuickBooks. The Service is provided on a subscription basis with a 14-day free trial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration</h2>
            <p className="text-gray-700 leading-relaxed">
              To use the Service, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account. You must be at least 18 years old to create an account and use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Free Trial and Subscription</h2>
            <p className="text-gray-700 leading-relaxed">
              New users receive a 14-day free trial with full access to all features. After the trial period, continued access to the Service requires an active paid subscription. Subscription fees, billing cycles, and plan details are displayed on our pricing page. We reserve the right to change pricing with 30 days&apos; notice to existing subscribers. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not use the Service to process fraudulent or illegally obtained financial data, attempt to gain unauthorized access to the Service or its related systems, interfere with or disrupt the Service or servers connected to it, reverse-engineer, decompile, or disassemble any part of the Service, resell or redistribute the Service without our written consent, or use the Service in any manner that could damage, disable, or impair the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Data</h2>
            <p className="text-gray-700 leading-relaxed">
              You retain all ownership rights to your financial data. By using the Service, you grant us a limited, non-exclusive license to access, process, and store your data solely for the purpose of providing and improving the Service. We will not use your data for any purpose other than delivering the Service to you, as described in our Privacy Policy. You are responsible for ensuring that any data you upload or connect through the Service is accurate and that you have the right to share it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Third-Party Integrations</h2>
            <p className="text-gray-700 leading-relaxed">
              The Service integrates with third-party platforms such as Intuit QuickBooks. Your use of these integrations is subject to the respective third party&apos;s terms of service and privacy policies. We are not responsible for the availability, accuracy, or practices of third-party services. You authorize us to access your third-party accounts as necessary to provide the Service, and you may revoke this access at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. AI-Generated Content</h2>
            <p className="text-gray-700 leading-relaxed">
              The Service uses artificial intelligence to categorize transactions, extract data, and generate financial reports and insights. While we strive for accuracy, AI-generated outputs may contain errors. You acknowledge that the Service is a tool to assist with bookkeeping and is not a substitute for professional accounting advice. You are responsible for reviewing and verifying all AI-generated categorizations, reports, and financial data before relying on them for business decisions, tax filings, or regulatory compliance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Intellectual Property</h2>
            <p className="text-gray-700 leading-relaxed">
              The Service, including its design, features, code, AI models, documentation, and branding, is owned by LedgerMind and protected by intellectual property laws. You are granted a limited, non-transferable, revocable license to use the Service for its intended purpose during your subscription period. Nothing in these Terms transfers any intellectual property rights to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p className="text-gray-700 leading-relaxed">
              To the maximum extent permitted by law, LedgerMind shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of the Service. Our total liability for any claims arising from or related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim. The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, whether express or implied.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Indemnification</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree to indemnify and hold harmless LedgerMind, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from your use of the Service, your violation of these Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Termination</h2>
            <p className="text-gray-700 leading-relaxed">
              We may suspend or terminate your access to the Service at any time if you violate these Terms or engage in conduct that we reasonably believe is harmful to the Service or other users. You may delete your account at any time. Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days after account deletion, after which it will be permanently removed from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by posting updated Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after any changes constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Governing Law</h2>
            <p className="text-gray-700 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these Terms or the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have questions about these Terms of Service, please contact us at support@ledgermind.app.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex gap-6 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-brand-600">Privacy Policy</Link>
          <Link href="/" className="hover:text-brand-600">Home</Link>
        </div>
      </main>
    </div>
  );
}
