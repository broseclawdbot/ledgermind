import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAuthorizationUrl } from '@/lib/quickbooks';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get optional business_id from query params
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    // Generate a state parameter with user info for the callback
    const stateData = {
      userId: session.user.id,
      businessId: businessId || null,
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Store state in a cookie for validation in callback
    const response = NextResponse.redirect(getAuthorizationUrl(state));
    response.cookies.set('qb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('QuickBooks connect error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks connection' },
      { status: 500 }
    );
  }
}
