import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { public_token, institution } = await request.json();

    if (!public_token) {
      return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Store the Plaid item
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .insert({
        user_id: user.id,
        item_id,
        access_token,
        institution_id: institution?.institution_id || null,
        institution_name: institution?.name || null,
        status: 'active',
      })
      .select()
      .single();

    if (itemError) {
      console.error('Error storing plaid item:', itemError);
      return NextResponse.json({ error: 'Failed to store connection' }, { status: 500 });
    }

    // Fetch accounts for this item
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;

    // Store accounts
    const accountsToInsert = accounts.map((account) => ({
      user_id: user.id,
      plaid_item_id: plaidItem.id,
      account_id: account.account_id,
      name: account.name,
      official_name: account.official_name || null,
      type: account.type,
      subtype: account.subtype || null,
      mask: account.mask || null,
      current_balance: account.balances.current,
      available_balance: account.balances.available,
      currency: account.balances.iso_currency_code || 'CAD',
    }));

    const { error: accountsError } = await supabase
      .from('plaid_accounts')
      .insert(accountsToInsert);

    if (accountsError) {
      console.error('Error storing accounts:', accountsError);
    }

    return NextResponse.json({
      success: true,
      item_id: plaidItem.id,
      accounts: accountsToInsert,
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}

