import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LedgerMind — AI-Powered Bookkeeping",
  description: "Upload receipts and documents. AI categorizes everything. See reports instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
