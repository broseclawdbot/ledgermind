# LedgerMind — AI-Powered Bookkeeping SaaS

Upload receipts and financial documents. AI reads, extracts, and categorizes everything. See P&L reports instantly.

## Quick Start (15 minutes to running locally)

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- An Anthropic API key (for Claude AI)
- Optional: Google Cloud Vision API key (for premium OCR)
- Optional: Stripe account (for billing)

### 1. Clone and Install

```bash
git clone <your-repo-url> ledgermind
cd ledgermind
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the contents of `supabase/schema.sql` — run it
3. Go to **Storage** → create a bucket called `uploads` (private)
4. Go to **Settings → API** — copy your URL and anon key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Fill in your keys in `.env.local`:

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same location |
| `SUPABASE_SERVICE_ROLE_KEY` | Same location (service_role key) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional — Google Cloud Console |
| `STRIPE_SECRET_KEY` | Optional — [dashboard.stripe.com](https://dashboard.stripe.com) |

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npx vercel
```

Set the same environment variables in Vercel's dashboard.

---

## Architecture

```
Next.js App Router (frontend + API routes)
       |
  Supabase (auth + PostgreSQL + storage)
       |
  Claude API (document extraction + categorization)
       |
  Google Cloud Vision (OCR for images — optional, Claude Vision as fallback)
       |
  Stripe (subscription billing)
```

## Project Structure

```
app/
  page.tsx                    → Landing page
  auth/login/page.tsx         → Login
  auth/register/page.tsx      → Registration
  auth/callback/route.ts      → OAuth callback
  dashboard/
    layout.tsx                → Dashboard shell (sidebar + topbar)
    page.tsx                  → Dashboard home with KPIs
    upload/page.tsx           → Drag-and-drop upload + AI processing
    review/page.tsx           → Review queue (approve/edit/reject)
    reports/page.tsx          → P&L report with PDF export
    transactions/page.tsx     → Transaction list with search/filters
    billing/page.tsx          → Pricing plans + Stripe checkout
    settings/page.tsx         → Business settings
  api/
    process-document/route.ts → Upload → OCR → AI extraction pipeline
    review/route.ts           → Approve/reject/correct documents
    stripe/checkout/route.ts  → Create Stripe checkout session
    stripe/webhook/route.ts   → Handle Stripe webhook events
components/
  layout/                     → Sidebar, TopBar, DashboardContent
  upload/                     → Upload zone components
  review/                     → Review card components
lib/
  supabase-server.ts          → Server-side Supabase client
  supabase-browser.ts         → Client-side Supabase client
  supabase-admin.ts           → Admin client (bypasses RLS)
  utils.ts                    → Formatting, helpers
types/
  database.ts                 → TypeScript types for all tables
supabase/
  schema.sql                  → Full database schema with RLS
```

## How the AI Pipeline Works

1. User uploads a file (image, PDF, CSV)
2. API route stores file in Supabase Storage
3. For images: Google Cloud Vision OCR (or Claude Vision fallback) extracts text
4. For PDFs: text extracted directly
5. For CSV/XLSX: parsed into structured data
6. Claude API extracts fields: vendor, amount, date, description
7. 3-stage categorization:
   - Stage 1: Check user-defined rules (free, instant)
   - Stage 2: Historical pattern matching (free, fast)
   - Stage 3: Claude AI classification (paid, accurate)
8. Confidence score assigned
9. High confidence (≥90%) → auto-approved → transaction created
10. Low confidence → review queue → user approves/edits → transaction created
11. After 3+ corrections for same vendor → auto-creates a rule

## Key Features

- **Upload anything**: Receipts, invoices, bank statements, CSVs
- **AI extraction**: Vendor, date, amount, category — all automatic
- **Review queue**: See AI confidence, approve/edit/reject
- **P&L reports**: With date ranges and PDF export
- **Multi-business**: Switch between businesses from the top bar
- **Stripe billing**: Subscription checkout built in
- **Auto-categorization rules**: System learns from your corrections

## Stripe Setup (Optional)

1. Create products and prices in Stripe Dashboard
2. Set `STRIPE_SECRET_KEY` and price IDs in `.env.local`
3. For webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
4. Set `STRIPE_WEBHOOK_SECRET` from the CLI output

## License

Proprietary — All rights reserved.
