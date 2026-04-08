import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { fetchAllTransactions, normalizeTransaction } from '@/lib/quickbooks';

export async function POST(request: Request) {
  try {
    // Verify user session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { connectionId, startDate, endDate } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
    }

    // Use service role for DB operations
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the connection belongs to this user
    const { data: connection, error: connError } = await adminClient
      .from('quickbooks_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', session.user.id)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.platform !== 'online') {
      return NextResponse.json(
        { error: 'Import is only supported for QuickBooks Online connections' },
        { status: 400 }
      );
    }

    // Create sync log entry
    const { data: syncLog } = await adminClient
      .from('quickbooks_sync_log')
      .insert({
        connection_id: connectionId,
        sync_type: startDate ? 'incremental' : 'full',
        status: 'started',
      })
      .select()
      .single();

    try {
      // Fetch all transaction types from QBO
      const allResults = await fetchAllTransactions(
        connectionId,
        connection.realm_id,
        startDate,
        endDate
      );

      let totalImported = 0;
      let totalUpdated = 0;

      for (const { type, transactions } of allResults) {
        if (transactions.length === 0) continue;

        // Normalize transactions
        const normalized = transactions.map((txn) => ({
          ...normalizeTransaction(txn, type),
          connection_id: connectionId,
          business_id: connection.business_id,
        }));

        // Upsert transactions (update if already imported)
        const { data: upserted, error: upsertError } = await adminClient
          .from('quickbooks_transactions')
          .upsert(normalized, {
            onConflict: 'connection_id,qb_transaction_id',
            ignoreDuplicates: false,
          })
          .select('id');

        if (upsertError) {
          console.error(`Error upserting ${type} transactions:`, upsertError);
          continue;
        }

        totalImported += upserted?.length || 0;
      }

      // Update sync log
      await adminClient
        .from('quickbooks_sync_log')
        .update({
          status: 'completed',
          transactions_imported: totalImported,
          transactions_updated: totalUpdated,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog?.id);

      // Update last sync time on connection
      await adminClient
        .from('quickbooks_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);

      return NextResponse.json({
        success: true,
        imported: totalImported,
        updated: totalUpdated,
        syncId: syncLog?.id,
      });
    } catch (importError: any) {
      // Update sync log with failure
      if (syncLog) {
        await adminClient
          .from('quickbooks_sync_log')
          .update({
            status: 'failed',
            error_message: importError.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', syncLog.id);
      }

      throw importError;
    }
  } catch (error: any) {
    console.error('QuickBooks import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check import status / fetch imported transactions
export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('quickbooks_transactions')
      .select('*, quickbooks_connections!inner(user_id)', { count: 'exact' });

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (status) {
      query = query.eq('review_status', status);
    }

    query = query
      .eq('quickbooks_connections.user_id', session.user.id)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: transactions, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      transactions,
      total: count,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('Error fetching QB transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
