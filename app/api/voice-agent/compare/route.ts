import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { filterTransactionsWithRecurring } from '@/lib/period-utils';
import YahooFinance from 'yahoo-finance2';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    const [{ data: allTransactions }, usdCadQuote] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      yahooFinance.quote('CAD=X').catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

    const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

    // Get this month and last month transactions
    const thisMonth = filterTransactionsWithRecurring(allTransactions || [], 'this-month');
    const lastMonth = filterTransactionsWithRecurring(allTransactions || [], 'last-month');

    const calculate = (transactions: typeof thisMonth) => {
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => {
          const amount = Number(t.amount);
          return sum + (t.currency === 'USD' ? amount * usdToCad : amount);
        }, 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => {
          const amount = Number(t.amount);
          return sum + (t.currency === 'USD' ? amount * usdToCad : amount);
        }, 0);

      const savings = income - expenses;
      const savingsRate = income > 0 ? (savings / income) * 100 : 0;

      return { income, expenses, savings, savingsRate };
    };

    const thisMonthStats = calculate(thisMonth);
    const lastMonthStats = calculate(lastMonth);

    // Calculate changes
    const incomeChange = lastMonthStats.income > 0 
      ? ((thisMonthStats.income - lastMonthStats.income) / lastMonthStats.income) * 100 
      : 0;
    const expenseChange = lastMonthStats.expenses > 0 
      ? ((thisMonthStats.expenses - lastMonthStats.expenses) / lastMonthStats.expenses) * 100 
      : 0;
    const savingsChange = thisMonthStats.savings - lastMonthStats.savings;

    return NextResponse.json({
      thisMonth: {
        income: Math.round(thisMonthStats.income * 100) / 100,
        expenses: Math.round(thisMonthStats.expenses * 100) / 100,
        savings: Math.round(thisMonthStats.savings * 100) / 100,
        savingsRate: Math.round(thisMonthStats.savingsRate * 10) / 10,
        transactionCount: thisMonth.length,
      },
      lastMonth: {
        income: Math.round(lastMonthStats.income * 100) / 100,
        expenses: Math.round(lastMonthStats.expenses * 100) / 100,
        savings: Math.round(lastMonthStats.savings * 100) / 100,
        savingsRate: Math.round(lastMonthStats.savingsRate * 10) / 10,
        transactionCount: lastMonth.length,
      },
      changes: {
        incomeChange: Math.round(incomeChange * 10) / 10,
        expenseChange: Math.round(expenseChange * 10) / 10,
        savingsChange: Math.round(savingsChange * 100) / 100,
        savingsRateChange: Math.round((thisMonthStats.savingsRate - lastMonthStats.savingsRate) * 10) / 10,
      },
      summary: {
        spendingUp: expenseChange > 0,
        incomeUp: incomeChange > 0,
        savingsImproved: savingsChange > 0,
      },
    });

  } catch (error) {
    console.error('Monthly comparison error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

