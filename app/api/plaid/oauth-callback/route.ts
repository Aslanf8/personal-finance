import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Get the oauth_state_id from the URL
  const searchParams = request.nextUrl.searchParams;
  const oauthStateId = searchParams.get('oauth_state_id');
  
  // Redirect back to settings with the oauth state
  // Plaid Link will pick up where it left off
  const redirectUrl = new URL('/settings', request.url);
  if (oauthStateId) {
    redirectUrl.searchParams.set('oauth_state_id', oauthStateId);
  }
  
  return NextResponse.redirect(redirectUrl);
}

