import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from '@/lib/plaid/config';
import { AxiosError } from 'axios';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build link token request
    // Note: redirect_uri is only needed for OAuth institutions (most Canadian banks)
    // It must be registered in Plaid Dashboard first
    const linkTokenRequest: Parameters<typeof plaidClient.linkTokenCreate>[0] = {
      user: { client_user_id: user.id },
      client_name: 'OpenFinance',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
    };

    // Only add redirect_uri if configured in environment
    // This must match exactly what's registered in Plaid Dashboard
    if (process.env.PLAID_REDIRECT_URI) {
      linkTokenRequest.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    const response = await plaidClient.linkTokenCreate(linkTokenRequest);

    return NextResponse.json({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    // Extract detailed error from Plaid
    let errorMessage = 'Failed to create link token';
    
    if (error instanceof AxiosError && error.response?.data) {
      const plaidError = error.response.data;
      console.error('Plaid API error:', JSON.stringify(plaidError, null, 2));
      errorMessage = plaidError.error_message || plaidError.display_message || errorMessage;
    } else {
      console.error('Error creating link token:', error);
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

