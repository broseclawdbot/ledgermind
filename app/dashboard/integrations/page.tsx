'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface QBConnection {
  id: string;
  platform: 'online' | 'desktop';
  company_name: string | null;
  realm_id: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  transactions_imported: number;
  transactions_updated: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<QBConnection[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showDesktopSetup, setShowDesktopSetup] = useState(false);
  const [desktopPassword, setDesktopPassword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const supabase = createClient();

  // Check for connection result in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'true') {
      setImportResult('QuickBooks Online connected successfully!');
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
    if (params.get('error')) {
      setImportResult(`Connection error: ${params.get('error')}`);
      window.history.replaceState({}, '', '/dashboard/integrations');
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    const { data } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setConnections(data);

    // Fetch recent sync logs
    if (data && data.length > 0) {
      const connectionIds = data.map((c) => c.id);
      const { data: logs } = await supabase
        .from('quickbooks_sync_log')
        .select('*')
        .in('connection_id', connectionIds)
        .order('started_at', { ascending: false })
        .limit(10);

      if (logs) setSyncLogs(logs);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleConnectOnline = () => {
    window.location.href = '/api/quickbooks/connect';
  };

  const handleImport = async (connectionId: string) => {
    setImporting(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/quickbooks/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setImportResult(
          `Import complete! ${result.imported} transactions imported.`
        );
        fetchConnections(); // Refresh to show updated sync time
      } else {
        setImportResult(`Import failed: ${result.error}`);
      }
    } catch (error: any) {
      setImportResult(`Import error: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this QuickBooks account?')) return;

    await supabase
      .from('quickbooks_connections')
      .update({ is_active: false })
      .eq('id', connectionId);

    fetchConnections();
  };

  const handleSetupDesktop = async () => {
    if (!desktopPassword) {
      setImportResult('Please enter a password for the Web Connector');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const username = `ledgermind-${session.user.id.slice(0, 8)}`;

      const { data, error } = await supabase
        .from('quickbooks_connections')
        .insert({
          user_id: session.user.id,
          platform: 'desktop',
          realm_id: username,
          access_token: desktopPassword,
          is_active: true,
          company_name: 'QuickBooks Desktop',
        })
        .select()
        .single();

      if (error) throw error;

      setImportResult('Desktop connection created! Download the .qwc file below to set up the Web Connector.');
      setShowDesktopSetup(false);
      setDesktopPassword('');
      fetchConnections();
    } catch (error: any) {
      setImportResult(`Error: ${error.message}`);
    }
  };

  const onlineConnections = connections.filter((c) => c.platform === 'online' && c.is_active);
  const desktopConnections = connections.filter((c) => c.platform === 'desktop' && c.is_active);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Integrations</h1>
      <p className="text-gray-600 mb-8">
        Connect your QuickBooks account to import transactions for AI-powered categorization and review.
      </p>

      {/* Status Message */}
      {importResult && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            importResult.includes('error') || importResult.includes('failed') || importResult.includes('Error')
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          <div className="flex justify-between items-center">
            <p>{importResult}</p>
            <button
              onClick={() => setImportResult(null)}
              className="text-sm underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* QuickBooks Online Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">QuickBooks Online</h2>
            <p className="text-sm text-gray-500">Connect via OAuth to import transactions from QBO</p>
          </div>
        </div>

        {onlineConnections.length > 0 ? (
          <div className="space-y-4">
            {onlineConnections.map((conn) => (
              <div key={conn.id} className="border border-gray-200 rounded-xl p-5 bg-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <h3 className="font-medium text-gray-900">
                        {conn.company_name || 'QuickBooks Online'}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Connected {new Date(conn.created_at).toLocaleDateString()}
                      {conn.last_sync_at && (
                        <> ÃÂ· Last synced {new Date(conn.last_sync_at).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Disconnect
                  </button>
                </div>

                {/* Import Controls */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Import Transactions</h4>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">From Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">To Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={() => handleImport(conn.id)}
                      disabled={importing}
                      className="bg-[#2c5282] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#1e3a5f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {importing ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Importing...
                        </span>
                      ) : (
                        'Import Now'
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Leave dates empty to import all available transactions
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-gray-600 mb-4">No QuickBooks Online account connected</p>
            <button
              onClick={handleConnectOnline}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Connect QuickBooks Online
            </button>
          </div>
        )}
      </section>

      {/* QuickBooks Desktop Section */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">QuickBooks Desktop</h2>
            <p className="text-sm text-gray-500">Connect via Web Connector to sync transactions from QB Desktop</p>
          </div>
        </div>

        {desktopConnections.length > 0 ? (
          <div className="space-y-4">
            {desktopConnections.map((conn) => (
              <div key={conn.id} className="border border-gray-200 rounded-xl p-5 bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      <h3 className="font-medium text-gray-900">
                        {conn.company_name || 'QuickBooks Desktop'}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Set up {new Date(conn.created_at).toLocaleDateString()}
                      {conn.last_sync_at && (
                        <> ÃÂ· Last synced {new Date(conn.last_sync_at).toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/api/quickbooks/desktop?connectionId=${conn.id}`}
                      download
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Download .qwc
                    </a>
                    <button
                      onClick={() => handleDisconnect(conn.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Username: {conn.realm_id} ÃÂ· Install the .qwc file in QuickBooks Web Connector to start syncing
                </p>
              </div>
            ))}
          </div>
        ) : showDesktopSetup ? (
          <div className="border border-gray-200 rounded-xl p-5 bg-white">
            <h3 className="font-medium text-gray-900 mb-3">Set Up Desktop Connection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a password for the Web Connector. You&#39;ll use this when adding the .qwc file to QuickBooks Desktop.
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Web Connector Password</label>
                <input
                  type="password"
                  value={desktopPassword}
                  onChange={(e) => setDesktopPassword(e.target.value)}
                  placeholder="Choose a secure password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSetupDesktop}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Create Connection
              </button>
              <button
                onClick={() => setShowDesktopSetup(false)}
                className="text-gray-500 px-3 py-2 text-sm hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 mb-4">No QuickBooks Desktop connection configured</p>
            <button
              onClick={() => setShowDesktopSetup(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Set Up Desktop Connection
            </button>
          </div>
        )}
      </section>

      {/* Recent Sync History */}
      {syncLogs.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sync History</h2>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Imported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">
                      {new Date(log.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-600">{log.sync_type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          log.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {log.transactions_imported}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Setup Instructions */}
      <section className="mt-10 bg-gray-50 rounded-xl p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="w-8 h-8 bg-[#2c5282] text-white rounded-full flex items-center justify-center font-bold mb-2">1</div>
            <h3 className="font-medium text-gray-900 mb-1">Connect</h3>
            <p className="text-gray-600">
              Link your QuickBooks Online account via secure OAuth, or set up the Web Connector for Desktop.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 bg-[#2c5282] text-white rounded-full flex items-center justify-center font-bold mb-2">2</div>
            <h3 className="font-medium text-gray-900 mb-1">Import</h3>
            <p className="text-gray-600">
              Pull in your transactions Ã¢ÂÂ purchases, invoices, payments, deposits, and journal entries.
            </p>
          </div>
          <div>
            <div className="w-8 h-8 bg-[#2c5282] text-white rounded-full flex items-center justify-center font-bold mb-2">3</div>
            <h3 className="font-medium text-gray-900 mb-1">Review</h3>
            <p className="text-gray-600">
              LedgerMind&#39;s AI automatically categorizes your transactions. Review and approve in the Review Queue.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
