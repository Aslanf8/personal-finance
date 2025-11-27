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

    if (!item_id) {
      return NextResponse.json({ error: 'Missing item_id' }, { status: 400 });
    }

    // Get the Plaid item
    const { data: plaidItem, error: itemError } = await supabase
      .from('plaid_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user.id)
      .single();

    if (itemError || !plaidItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Remove item from Plaid
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.access_token,
      });
    } catch (plaidError) {
      console.error('Error removing item from Plaid:', plaidError);
      // Continue anyway to clean up our database
    }

    // Delete accounts associated with this item
    await supabase
      .from('plaid_accounts')
      .delete()
      .eq('plaid_item_id', item_id);

    // Delete the item
    await supabase
      .from('plaid_items')
      .delete()
      .eq('id', item_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

