-- ═══════════════════════════════════════════════════════════════
-- LedgerMind Database Schema (Scrappy MVP)
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── PROFILES (extends Supabase auth.users) ───────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  stripe_customer_id text,
  plan text default 'trial' check (plan in ('trial', 'starter', 'pro', 'business')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── BUSINESSES ────────────────────────────────────────────────
create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  entity_type text default 'llc',
  industry text default 'general',
  currency text default 'USD',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── CATEGORIES (chart of accounts simplified) ─────────────────
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  parent_id uuid references public.categories(id),
  color text default '#2E86C1',
  icon text default 'tag',
  is_default boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ─── VENDORS ───────────────────────────────────────────────────
create table public.vendors (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  default_category_id uuid references public.categories(id),
  times_seen int default 1,
  created_at timestamptz default now()
);

-- ─── UPLOADS ───────────────────────────────────────────────────
create table public.uploads (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_path text not null,
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz default now()
);

-- ─── DOCUMENTS (AI-extracted data) ─────────────────────────────
create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  upload_id uuid not null references public.uploads(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  vendor_name text,
  amount decimal(15,2),
  date date,
  description text,
  category_id uuid references public.categories(id),
  category_name text,
  transaction_type text default 'expense' check (transaction_type in ('income', 'expense', 'transfer')),
  ai_confidence decimal(5,2) default 0,
  ai_reasoning text,
  extracted_data jsonb default '{}',
  review_status text default 'pending' check (review_status in ('pending', 'auto_approved', 'approved', 'rejected', 'corrected')),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── TRANSACTIONS (approved items from documents + manual) ─────
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  document_id uuid references public.documents(id),
  vendor_name text,
  vendor_id uuid references public.vendors(id),
  amount decimal(15,2) not null,
  date date not null,
  description text,
  category_id uuid references public.categories(id),
  category_name text,
  transaction_type text not null check (transaction_type in ('income', 'expense', 'transfer')),
  source text default 'upload' check (source in ('manual', 'upload', 'import')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── CATEGORIZATION RULES ──────────────────────────────────────
create table public.categorization_rules (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  vendor_pattern text not null,
  category_id uuid not null references public.categories(id),
  transaction_type text default 'expense',
  times_applied int default 0,
  source text default 'manual' check (source in ('manual', 'ai_learned')),
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ─── INDEXES ───────────────────────────────────────────────────
create index idx_businesses_user on public.businesses(user_id);
create index idx_categories_business on public.categories(business_id);
create index idx_vendors_business on public.vendors(business_id);
create index idx_vendors_normalized on public.vendors(business_id, normalized_name);
create index idx_uploads_business on public.uploads(business_id);
create index idx_documents_business on public.documents(business_id);
create index idx_documents_review on public.documents(business_id, review_status);
create index idx_transactions_business on public.transactions(business_id);
create index idx_transactions_date on public.transactions(business_id, date);
create index idx_transactions_category on public.transactions(business_id, category_id);
create index idx_rules_business on public.categorization_rules(business_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.categories enable row level security;
alter table public.vendors enable row level security;
alter table public.uploads enable row level security;
alter table public.documents enable row level security;
alter table public.transactions enable row level security;
alter table public.categorization_rules enable row level security;

-- Profiles: users see only their own
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Businesses: users see only their own
create policy "Users manage own businesses" on public.businesses for all using (auth.uid() = user_id);

-- Categories: users see categories for their businesses
create policy "Users manage own categories" on public.categories for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- Vendors: same pattern
create policy "Users manage own vendors" on public.vendors for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- Uploads
create policy "Users manage own uploads" on public.uploads for all
  using (user_id = auth.uid());

-- Documents
create policy "Users manage own documents" on public.documents for all
  using (user_id = auth.uid());

-- Transactions
create policy "Users manage own transactions" on public.transactions for all
  using (user_id = auth.uid());

-- Rules
create policy "Users manage own rules" on public.categorization_rules for all
  using (business_id in (select id from public.businesses where user_id = auth.uid()));

-- ─── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── AUTO-CREATE DEFAULT CATEGORIES ────────────────────────────
create or replace function public.create_default_categories()
returns trigger as $$
begin
  insert into public.categories (business_id, name, type, is_default, sort_order) values
    (new.id, 'Sales Revenue', 'income', true, 1),
    (new.id, 'Service Revenue', 'income', true, 2),
    (new.id, 'Other Income', 'income', true, 3),
    (new.id, 'Advertising & Marketing', 'expense', true, 10),
    (new.id, 'Bank Fees', 'expense', true, 11),
    (new.id, 'Contractors', 'expense', true, 12),
    (new.id, 'Education & Training', 'expense', true, 13),
    (new.id, 'Equipment', 'expense', true, 14),
    (new.id, 'Insurance', 'expense', true, 15),
    (new.id, 'Internet & Phone', 'expense', true, 16),
    (new.id, 'Meals & Entertainment', 'expense', true, 17),
    (new.id, 'Office Supplies', 'expense', true, 18),
    (new.id, 'Payroll', 'expense', true, 19),
    (new.id, 'Professional Services', 'expense', true, 20),
    (new.id, 'Rent', 'expense', true, 21),
    (new.id, 'Software & Subscriptions', 'expense', true, 22),
    (new.id, 'Travel', 'expense', true, 23),
    (new.id, 'Utilities', 'expense', true, 24),
    (new.id, 'Vehicle Expenses', 'expense', true, 25),
    (new.id, 'Other Expenses', 'expense', true, 30),
    (new.id, 'Transfer', 'transfer', true, 40);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_business_created
  after insert on public.businesses
  for each row execute function public.create_default_categories();

-- ─── STORAGE BUCKET ────────────────────────────────────────────
-- Run this separately or via Supabase Dashboard:
-- insert into storage.buckets (id, name, public) values ('uploads', 'uploads', false);
