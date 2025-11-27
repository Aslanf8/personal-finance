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

    // Get expenses only
    const expenses = transactions.filter(t => t.type === 'expense');

    // Group by category
    const byCategory: Record<string, number> = {};
    expenses.forEach(t => {
      const amount = Number(t.amount);
      const converted = t.currency === 'USD' ? amount * usdToCad : amount;
      byCategory[t.category] = (byCategory[t.category] || 0) + converted;
    });

    // Sort by amount descending
    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalSpending = categories.reduce((sum, c) => sum + c.amount, 0);

    // Calculate income for savings rate
    const income = transactions.filter(t => t.type === 'income');
    const totalIncome = income.reduce((sum, t) => {
      const amount = Number(t.amount);
      const converted = t.currency === 'USD' ? amount * usdToCad : amount;
      return sum + converted;
    }, 0);

    const savings = totalIncome - totalSpending;
    const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0;

    return NextResponse.json({
      period,
      categories,
      totalSpending: Math.round(totalSpending * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsRate: Math.round(savingsRate * 10) / 10,
      topCategory: categories[0]?.category || null,
      topCategoryAmount: categories[0]?.amount || 0,
    });

  } catch (error) {
    console.error('Spending error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

