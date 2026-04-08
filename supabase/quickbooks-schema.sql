-- QuickBooks Integration Schema
-- Stores OAuth connections and synced transaction data

-- QuickBooks connections table
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('online', 'desktop')),
  -- QBO OAuth fields
  realm_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  -- Desktop Web Connector fields
  desktop_file_path TEXT,
  desktop_company_name TEXT,
  -- Connection metadata
  company_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_qb_connections_user ON quickbooks_connections(user_id);
CREATE INDEX idx_qb_connections_business ON quickbooks_connections(business_id);
CREATE UNIQUE INDEX idx_qb_connections_realm ON quickbooks_connections(realm_id) WHERE realm_id IS NOT NULL;

-- Synced QuickBooks transactions
CREATE TABLE IF NOT EXISTS quickbooks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES quickbooks_connections(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  qb_transaction_id TEXT NOT NULL,
  qb_transaction_type TEXT NOT NULL, -- 'Purchase', 'Invoice', 'Payment', 'Deposit', 'Transfer', 'JournalEntry'
  date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  vendor_name TEXT,
  customer_name TEXT,
  account_name TEXT,
  category TEXT,
  memo TEXT,
  raw_data JSONB,
  -- LedgerMind processing
  ai_category TEXT,
  ai_confidence DECIMAL(3,2),
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Indexes for querying transactions
CREATE INDEX idx_qb_txns_connection ON quickbooks_transactions(connection_id);
CREATE INDEX idx_qb_txns_business ON quickbooks_transactions(business_id);
CREATE INDEX idx_qb_txns_date ON quickbooks_transactions(date);
CREATE INDEX idx_qb_txns_status ON quickbooks_transactions(review_status);
CREATE UNIQUE INDEX idx_qb_txns_unique ON quickbooks_transactions(connection_id, qb_transaction_id);

-- Sync log for tracking import history
CREATE TABLE IF NOT EXISTS quickbooks_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES quickbooks_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  transactions_imported INTEGER DEFAULT 0,
  transactions_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own QB connections"
  ON quickbooks_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own QB connections"
  ON quickbooks_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own QB connections"
  ON quickbooks_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own QB connections"
  ON quickbooks_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own QB transactions"
  ON quickbooks_transactions FOR SELECT
  USING (connection_id IN (
    SELECT id FROM quickbooks_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert QB transactions via connection"
  ON quickbooks_transactions FOR INSERT
  WITH CHECK (connection_id IN (
    SELECT id FROM quickbooks_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own QB transactions"
  ON quickbooks_transactions FOR UPDATE
  USING (connection_id IN (
    SELECT id FROM quickbooks_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view own sync logs"
  ON quickbooks_sync_log FOR SELECT
  USING (connection_id IN (
    SELECT id FROM quickbooks_connections WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert sync logs"
  ON quickbooks_sync_log FOR INSERT
  WITH CHECK (connection_id IN (
    SELECT id FROM quickbooks_connections WHERE user_id = auth.uid()
  ));
