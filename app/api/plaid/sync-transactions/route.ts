import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { plaidClient } from '@/lib/plaid/config';
import { RemovedTransaction, Transaction as PlaidTransactionType } from 'plaid';

// Map Plaid categories to our categories
function mapCategory(plaidCategories: string[] | null | undefined): string {
  if (!plaidCategories?.length) return 'Other';
  
  const primary = plaidCategories[0].toLowerCase();
  
  const categoryMap: Record<string, string> = {
    'food and drink': 'Food',
    'shops': 'Personal',
    'travel': 'Transportation',
    'transfer': 'Other',
    'payment': 'Debt Payment',
    'recreation': 'Entertainment',
    'service': 'Other',
    'healthcare': 'Healthcare',
    'community': 'Other',
    'bank fees': 'Other',
    'tax': 'Other',
  };

  for (const [key, value] of Object.entries(categoryMap)) {
    if (primary.includes(key)) return value;
  }
  
  return 'Other';
}

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

    let transactionsAdded = 0;
    let transactionsModified = 0;
    let transactionsRemoved = 0;

    for (const item of plaidItems) {
      try {
        let hasMore = true;
        let cursor = item.cursor || undefined;

        while (hasMore) {
          const response = await plaidClient.transactionsSync({
            access_token: item.access_token,
            cursor,
          });

          const { added, modified, removed, next_cursor, has_more } = response.data;

          // Process added transactions
          for (const txn of added as PlaidTransactionType[]) {
            if (txn.pending) continue; // Skip pending transactions

            const transactionData = {
              user_id: user.id,
              amount: Math.abs(txn.amount),
              category: mapCategory(txn.category),
              type: txn.amount > 0 ? 'expense' : 'income', // Plaid: positive = money out
              date: txn.date,
              description: txn.merchant_name || txn.name,
              currency: (txn.iso_currency_code as 'CAD' | 'USD') || 'CAD',
              is_recurring: false,
              notes: `Imported from ${item.institution_name || 'Plaid'}`,
            };

            const { error } = await supabase
              .from('transactions')
              .insert(transactionData);

            if (!error) transactionsAdded++;
          }

          // Process modified transactions (we'll skip for now as we don't track plaid_transaction_id)
          transactionsModified += (modified as PlaidTransactionType[]).length;

          // Process removed transactions (we'll skip for now)
          transactionsRemoved += (removed as RemovedTransaction[]).length;

          cursor = next_cursor;
          hasMore = has_more;
        }

        // Update cursor for next sync
        await supabase
          .from('plaid_items')
          .update({ 
            cursor,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', item.id);

      } catch (plaidError) {
        console.error(`Error syncing transactions for item ${item.id}:`, plaidError);
        await supabase
          .from('plaid_items')
          .update({ status: 'error' })
          .eq('id', item.id);
      }
    }

    return NextResponse.json({
      success: true,
      transactions_added: transactionsAdded,
      transactions_modified: transactionsModified,
      transactions_removed: transactionsRemoved,
    });
  } catch (error) {
    console.error('Error syncing transactions:', error);
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    );
  }
}

