import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens, getCompanyInfo } from '@/lib/quickbooks';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=access_denied`
      );
    }

    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=missing_params`
      );
    }

    // Validate state parameter
    const cookieStore = cookies();
    const storedState = cookieStore.get('qb_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=invalid_state`
      );
    }

    // Decode state to get user info
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    const { userId, businessId } = stateData;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Use service role client to store connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Store the connection
    const connectionData: any = {
      user_id: userId,
      platform: 'online',
      realm_id: realmId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      is_active: true,
    };

    if (businessId) {
      connectionData.business_id = businessId;
    }

    // Upsert â update if realm already connected, otherwise insert
    const { data: connection, error: dbError } = await supabase
      .from('quickbooks_connections')
      .upsert(connectionData, { onConflict: 'realm_id' })
      .select()
      .single();

    if (dbError) {
      console.error('DB error storing QB connection:', dbError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=db_error`
      );
    }

    // Fetch company info to store the name
    try {
      const companyInfo = await getCompanyInfo(connection.id, realmId);
      await supabase
        .from('quickbooks_connections')
        .update({ company_name: companyInfo.CompanyName })
        .eq('id', connection.id);
    } catch (e) {
      console.warn('Could not fetch company info:', e);
    }

    // Clear the state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=true`
    );
    response.cookies.delete('qb_oauth_state');

    return response;
  } catch (error: any) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=callback_failed`
    );
  }
}
