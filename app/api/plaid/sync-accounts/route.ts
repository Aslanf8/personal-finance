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

    const { item_id } = await request.json();

    // Get Plaid item(s) to sync
    let query = supabase
      .from('plaid_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (item_id) {
      query = query.eq('id', item_id);
    }

    const { data: plaidItems, error: itemsError } = await query;

    if (itemsError || !plaidItems?.length) {
      return NextResponse.json({ error: 'No connected accounts found' }, { status: 404 });
    }

    let accountsUpdated = 0;

    for (const item of plaidItems) {
      try {
        // Fetch latest account balances
        const accountsResponse = await plaidClient.accountsGet({
          access_token: item.access_token,
        });

        for (const account of accountsResponse.data.accounts) {
          const { error: updateError } = await supabase
            .from('plaid_accounts')
            .update({
              current_balance: account.balances.current,
              available_balance: account.balances.available,
              updated_at: new Date().toISOString(),
            })
            .eq('account_id', account.account_id)
            .eq('user_id', user.id);

          if (!updateError) {
            accountsUpdated++;
          }
        }

        // Update item's last_synced_at
        await supabase
          .from('plaid_items')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', item.id);

      } catch (plaidError) {
        console.error(`Error syncing item ${item.id}:`, plaidError);
        // Mark item as having an error
        await supabase
          .from('plaid_items')
          .update({ status: 'error' })
          .eq('id', item.id);
      }
    }

    return NextResponse.json({
      success: true,
      accounts_updated: accountsUpdated,
    });
  } catch (error) {
    console.error('Error syncing accounts:', error);
    return NextResponse.json(
      { error: 'Failed to sync accounts' },
      { status: 500 }
    );
  }
}

