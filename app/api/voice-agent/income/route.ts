import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filterTransactionsWithRecurring, type Period } from '@/lib/period-utils';
import YahooFinance from 'yahoo-finance2';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as Period) || 'this-month';

    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    const [{ data: allTransactions }, usdCadQuote] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      yahooFinance.quote('CAD=X').catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

    const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

    // Filter by period
    const transactions = filterTransactionsWithRecurring(allTransactions || [], period);

    // Get income only
    const income = transactions.filter(t => t.type === 'income');

    // Group by category
    const byCategory: Record<string, { amount: number; count: number }> = {};
    income.forEach(t => {
      const amount = Number(t.amount);
      const converted = t.currency === 'USD' ? amount * usdToCad : amount;
      if (!byCategory[t.category]) {
        byCategory[t.category] = { amount: 0, count: 0 };
      }
      byCategory[t.category].amount += converted;
      byCategory[t.category].count += 1;
    });

    // Sort by amount descending
    const categories = Object.entries(byCategory)
      .map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalIncome = categories.reduce((sum, c) => sum + c.amount, 0);

    return NextResponse.json({
      period,
      categories,
      totalIncome: Math.round(totalIncome * 100) / 100,
      primarySource: categories[0]?.category || null,
      primarySourceAmount: categories[0]?.amount || 0,
      sourceCount: categories.length,
    });

  } catch (error) {
    console.error('Income breakdown error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

