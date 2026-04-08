import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// QuickBooks Web Connector (QBWC) SOAP endpoint for Desktop integration
// The Web Connector communicates via SOAP XML messages

const QBWC_VERSION = '2.1';

function soapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

function extractSoapAction(xml: string): string {
  // Extract the method name from the SOAP body
  const match = xml.match(/<(\w+)Response?[>\s]/);
  if (match) return match[1];

  const methods = [
    'serverVersion', 'clientVersion', 'authenticate',
    'sendRequestXML', 'receiveResponseXML', 'getLastError',
    'connectionError', 'closeConnection'
  ];

  for (const method of methods) {
    if (xml.includes(method)) return method;
  }

  return 'unknown';
}

export async function POST(request: Request) {
  try {
    const xml = await request.text();
    const action = extractSoapAction(xml);

    let responseBody: string;

    switch (action) {
      case 'serverVersion':
        responseBody = `<serverVersionResponse xmlns="http://developer.intuit.com/">
          <serverVersionResult>${QBWC_VERSION}</serverVersionResult>
        </serverVersionResponse>`;
        break;

      case 'clientVersion':
        // Return empty string to accept any client version
        responseBody = `<clientVersionResponse xmlns="http://developer.intuit.com/">
          <clientVersionResult></clientVersionResult>
        </clientVersionResponse>`;
        break;

      case 'authenticate': {
        // Extract username and password from SOAP
        const userMatch = xml.match(/<strUserName>(.*?)<\/strUserName>/);
        const passMatch = xml.match(/<strPassword>(.*?)<\/strPassword>/);
        const username = userMatch?.[1] || '';
        const password = passMatch?.[1] || '';

        // Validate against stored Desktop connections
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: connection } = await supabase
          .from('quickbooks_connections')
          .select('*')
          .eq('platform', 'desktop')
          .eq('realm_id', username) // We use realm_id to store the QBWC username
          .eq('access_token', password) // We use access_token to store the QBWC password
          .eq('is_active', true)
          .single();

        if (connection) {
          // Return connection ID as ticket and empty string (no company file path = use current)
          responseBody = `<authenticateResponse xmlns="http://developer.intuit.com/">
            <authenticateResult>
              <string>${connection.id}</string>
              <string></string>
            </authenticateResult>
          </authenticateResponse>`;
        } else {
          // Return "nvu" (not valid user) to reject
          responseBody = `<authenticateResponse xmlns="http://developer.intuit.com/">
            <authenticateResult>
              <string></string>
              <string>nvu</string>
            </authenticateResult>
          </authenticateResponse>`;
        }
        break;
      }

      case 'sendRequestXML': {
        // Send qbXML request to query transactions
        const ticketMatch = xml.match(/<ticket>(.*?)<\/ticket>/);
        const ticket = ticketMatch?.[1] || '';

        // Build qbXML query for transactions
        const qbXmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<?qbxml version="13.0"?>
<QBXML>
  <QBXMLMsgsRq onError="continueOnError">
    <TransactionQueryRq requestID="1">
      <ModifiedDateRangeFilter>
        <FromModifiedDate>${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}</FromModifiedDate>
      </ModifiedDateRangeFilter>
      <IncludeLineItems>true</IncludeLineItems>
    </TransactionQueryRq>
  </QBXMLMsgsRq>
</QBXML>`;

        responseBody = `<sendRequestXMLResponse xmlns="http://developer.intuit.com/">
          <sendRequestXMLResult>${escapeXml(qbXmlRequest)}</sendRequestXMLResult>
        </sendRequestXMLResponse>`;
        break;
      }

      case 'receiveResponseXML': {
        // Process the response from QuickBooks Desktop
        const ticketMatch2 = xml.match(/<ticket>(.*?)<\/ticket>/);
        const responseMatch = xml.match(/<response>([\s\S]*?)<\/response>/);
        const ticket2 = ticketMatch2?.[1] || '';
        const qbResponse = responseMatch?.[1] || '';

        if (ticket2 && qbResponse) {
          // Parse and store transactions asynchronously
          try {
            await processDesktopTransactions(ticket2, qbResponse);
          } catch (e) {
            console.error('Error processing desktop transactions:', e);
          }
        }

        // Return 100 to indicate we're done (no more requests)
        responseBody = `<receiveResponseXMLResponse xmlns="http://developer.intuit.com/">
          <receiveResponseXMLResult>100</receiveResponseXMLResult>
        </receiveResponseXMLResponse>`;
        break;
      }

      case 'getLastError':
        responseBody = `<getLastErrorResponse xmlns="http://developer.intuit.com/">
          <getLastErrorResult></getLastErrorResult>
        </getLastErrorResponse>`;
        break;

      case 'closeConnection':
        responseBody = `<closeConnectionResponse xmlns="http://developer.intuit.com/">
          <closeConnectionResult>OK</closeConnectionResult>
        </closeConnectionResponse>`;
        break;

      default:
        responseBody = `<${action}Response xmlns="http://developer.intuit.com/">
          <${action}Result></${action}Result>
        </${action}Response>`;
    }

    return new NextResponse(soapEnvelope(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('QBWC error:', error);
    return new NextResponse(
      soapEnvelope(`<fault><faultstring>${error.message}</faultstring></fault>`),
      { status: 500, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function processDesktopTransactions(connectionId: string, qbXmlResponse: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get connection details
  const { data: connection } = await supabase
    .from('quickbooks_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (!connection) return;

  // Parse basic transaction data from qbXML response
  // This handles common transaction types returned by Desktop
  const txnRegex = /<(Check|Bill|Invoice|Deposit|Transfer|JournalEntry)Ret>([\s\S]*?)<\/\1Ret>/g;
  let match;
  const transactions: any[] = [];

  while ((match = txnRegex.exec(qbXmlResponse)) !== null) {
    const type = match[1];
    const txnXml = match[2];

    const getId = (tag: string) => {
      const m = txnXml.match(new RegExp(`<${tag}>(.*?)<\/${tag}>`));
      return m?.[1] || null;
    };

    transactions.push({
      connection_id: connectionId,
      business_id: connection.business_id,
      qb_transaction_id: getId('TxnID') || `desktop-${Date.now()}`,
      qb_transaction_type: type,
      date: getId('TxnDate') || new Date().toISOString().split('T')[0],
      amount: parseFloat(getId('Amount') || getId('TotalAmt') || '0'),
      description: getId('Memo') || `${type} from QuickBooks Desktop`,
      vendor_name: getId('VendorRef') ? getId('FullName') : null,
      customer_name: getId('CustomerRef') ? getId('FullName') : null,
      memo: getId('Memo'),
      raw_data: { xml: txnXml.substring(0, 2000) }, // Store truncated XML
    });
  }

  if (transactions.length > 0) {
    await supabase
      .from('quickbooks_transactions')
      .upsert(transactions, {
        onConflict: 'connection_id,qb_transaction_id',
        ignoreDuplicates: false,
      });

    // Update last sync time
    await supabase
      .from('quickbooks_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);
  }
}

// GET endpoint to download the .qwc file for Web Connector setup
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json({ error: 'Connection ID required' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const qwcContent = `<?xml version="1.0"?>
<QBWCXML>
  <AppName>LedgerMind</AppName>
  <AppID>LedgerMind-QB</AppID>
  <AppURL>${appUrl}/api/quickbooks/desktop</AppURL>
  <AppDescription>LedgerMind AI-Powered Bookkeeping - QuickBooks Desktop Integration</AppDescription>
  <AppSupport>${appUrl}/dashboard/integrations</AppSupport>
  <UserName>${connectionId}</UserName>
  <OwnerID>{a]b8e8f2-7c3d-4e5f-9a1b-2c3d4e5f6a7b}</OwnerID>
  <FileID>{c8d9e0f1-2a3b-4c5d-6e7f-8a9b0c1d2e3f}</FileID>
  <QBType>QBFS</QBType>
  <Scheduler>
    <RunEveryNMinutes>60</RunEveryNMinutes>
  </Scheduler>
</QBWCXML>`;

  return new NextResponse(qwcContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="ledgermind-qbdesktop.qwc"`,
    },
  });
}
