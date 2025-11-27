import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { expandRecurringTransactions } from '@/lib/period-utils';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const type = searchParams.get('type'); // 'income' | 'expense' | null
    const category = searchParams.get('category');

    const { data: allTransactions } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    // Expand recurring transactions
    let transactions = expandRecurringTransactions(allTransactions || [], new Date());

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply filters
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }
    if (category) {
      transactions = transactions.filter(t => 
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Limit results
    transactions = transactions.slice(0, limit);

    // Format for voice response
    const formatted = transactions.map(t => ({
      date: t.date,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      description: t.description || t.category,
      currency: t.currency || 'CAD',
    }));

    return NextResponse.json({
      transactions: formatted,
      count: formatted.length,
      totalCount: allTransactions?.length || 0,
    });

  } catch (error) {
    console.error('Transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

