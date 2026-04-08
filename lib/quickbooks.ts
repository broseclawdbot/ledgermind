import { createClient } from '@supabase/supabase-js';

const INTUIT_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const INTUIT_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const QBO_BASE_URL = process.env.QUICKBOOKS_SANDBOX === 'true'
  ? 'https://sandbox-quickbooks.api.intuit.com'
  : 'https://quickbooks.api.intuit.com';

const QBO_API_VERSION = 'v3';

export interface QBTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  x_refresh_token_expires_in: number;
}

export interface QBTransaction {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  DocNumber?: string;
  PrivateNote?: string;
  Line?: Array<{
    Amount: number;
    Description?: string;
    DetailType: string;
    AccountBasedExpenseLineDetail?: {
      AccountRef: { value: string; name: string };
    };
  }>;
  VendorRef?: { value: string; name: string };
  CustomerRef?: { value: string; name: string };
  AccountRef?: { value: string; name: string };
}

// Generate OAuth authorization URL
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/callback`,
    state,
  });

  return `${INTUIT_AUTH_URL}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<QBTokens> {
  const credentials = Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/callback`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string): Promise<QBTokens> {
  const credentials = Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(INTUIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

// Get a valid access token, refreshing if needed
export async function getValidAccessToken(connectionId: string): Promise<string> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: connection, error } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error || !connection) {
    throw new Error('QuickBooks connection not found');
  }

  const now = new Date();
  const tokenExpiry = new Date(connection.token_expires_at);

  // Refresh if token expires within 5 minutes
  if (tokenExpiry.getTime() - now.getTime() < 5 * 60 * 1000) {
    const tokens = await refreshAccessToken(connection.refresh_token);

    await supabase
      .from('quickbooks_connections')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return tokens.access_token;
  }

  return connection.access_token;
}

// Make an authenticated QBO API request
export async function qboRequest(
  connectionId: string,
  realmId: string,
  endpoint: string,
  method: string = 'GET',
  body?: object
): Promise<any> {
  const accessToken = await getValidAccessToken(connectionId);

  const url = `${QBO_BASE_URL}/${QBO_API_VERSION}/company/${realmId}/${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QBO API error (${response.status}): ${error}`);
  }

  return response.json();
}

// Fetch company info
export async function getCompanyInfo(connectionId: string, realmId: string) {
  const data = await qboRequest(connectionId, realmId, `companyinfo/${realmId}`);
  return data.CompanyInfo;
}

// Query transactions using QBO query language
export async function queryTransactions(
  connectionId: string,
  realmId: string,
  txnType: string,
  startDate?: string,
  endDate?: string,
  startPosition: number = 1,
  maxResults: number = 100
): Promise<any[]> {
  let query = `SELECT * FROM ${txnType}`;
  const conditions: string[] = [];

  if (startDate) conditions.push(`TxnDate >= '${startDate}'`);
  if (endDate) conditions.push(`TxnDate <= '${endDate}'`);

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDERBY TxnDate DESC STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;

  const data = await qboRequest(
    connectionId,
    realmId,
    `query?query=${encodeURIComponent(query)}`
  );

  return data.QueryResponse?.[txnType] || [];
}

// Fetch all transaction types for import
export async function fetchAllTransactions(
  connectionId: string,
  realmId: string,
  startDate?: string,
  endDate?: string
): Promise<Array<{ type: string; transactions: any[] }>> {
  const txnTypes = ['Purchase', 'Invoice', 'Payment', 'Deposit', 'Transfer', 'JournalEntry'];

  const results = await Promise.allSettled(
    txnTypes.map(async (type) => ({
      type,
      transactions: await queryTransactions(connectionId, realmId, type, startDate, endDate),
    }))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ type: string; transactions: any[] }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value);
}

// Normalize a QBO transaction into our standard format
export function normalizeTransaction(txn: any, txnType: string) {
  return {
    qb_transaction_id: txn.Id,
    qb_transaction_type: txnType,
    date: txn.TxnDate,
    amount: parseFloat(txn.TotalAmt || txn.Amount || '0'),
    description: txn.PrivateNote || txn.DocNumber || `${txnType} #${txn.Id}`,
    vendor_name: txn.VendorRef?.name || null,
    customer_name: txn.CustomerRef?.name || null,
    account_name: txn.AccountRef?.name ||
      txn.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || null,
    category: txn.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name || null,
    memo: txn.PrivateNote || null,
    raw_data: txn,
  };
}
