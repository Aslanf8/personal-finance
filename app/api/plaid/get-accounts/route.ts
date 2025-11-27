import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connected accounts with institution info
    const { data: accounts, error } = await supabase
      .from('plaid_accounts')
      .select(`
        *,
        plaid_items (
          institution_name,
          status,
          last_synced_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    // Flatten the response
    const formattedAccounts = accounts?.map((account) => ({
      ...account,
      institution_name: account.plaid_items?.institution_name,
      item_status: account.plaid_items?.status,
      last_synced_at: account.plaid_items?.last_synced_at,
      plaid_items: undefined,
    })) || [];

    return NextResponse.json({ accounts: formattedAccounts });
  } catch (error) {
    console.error('Error in get-accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

