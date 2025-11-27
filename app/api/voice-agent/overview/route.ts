import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { expandRecurringTransactions, filterTransactionsWithRecurring } from '@/lib/period-utils';
import YahooFinance from 'yahoo-finance2';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    const [
      { data: allTransactions },
      { data: investments },
      { data: prices },
      { data: profile },
      { data: primaryGoal },
      usdCadQuote,
    ] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      supabase.from('investments').select('*'),
      supabase.from('market_prices').select('*'),
      supabase.from('profiles').select('full_name, currency, birthday').eq('id', user.id).single(),
      supabase.from('financial_goals').select('name, target_amount, goal_type').eq('user_id', user.id).eq('is_primary', true).single(),
      yahooFinance.quote('CAD=X').catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

    const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

    // Calculate cash balance
    const expandedTransactions = expandRecurringTransactions(allTransactions || [], new Date());
    const totalIncome = expandedTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.currency === 'USD' ? Number(t.amount) * usdToCad : Number(t.amount)), 0);
    const totalExpenses = expandedTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.currency === 'USD' ? Number(t.amount) * usdToCad : Number(t.amount)), 0);
    const cashBalance = totalIncome - totalExpenses;

    // Calculate investments
    const priceMap = (prices || []).reduce(
      (acc, p) => ({ ...acc, [p.symbol]: Number(p.price) }),
      {} as Record<string, number>
    );
    const investValueUSD = (investments || []).reduce((sum, i) => {
      const price = priceMap[i.symbol] ?? Number(i.avg_cost);
      return sum + price * Number(i.quantity);
    }, 0);
    const investCostUSD = (investments || []).reduce(
      (sum, i) => sum + Number(i.avg_cost) * Number(i.quantity), 0
    );
    const investValueCAD = investValueUSD * usdToCad;
    const investGainPercent = investCostUSD > 0 ? ((investValueUSD - investCostUSD) / investCostUSD) * 100 : 0;

    const netWorth = cashBalance + investValueCAD;

    // This month stats
    const thisMonth = filterTransactionsWithRecurring(allTransactions || [], 'this-month');
    const monthIncome = thisMonth
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.currency === 'USD' ? Number(t.amount) * usdToCad : Number(t.amount)), 0);
    const monthExpenses = thisMonth
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.currency === 'USD' ? Number(t.amount) * usdToCad : Number(t.amount)), 0);
    const monthSavings = monthIncome - monthExpenses;
    const savingsRate = monthIncome > 0 ? (monthSavings / monthIncome) * 100 : 0;

    // Top spending category this month
    const expensesByCategory: Record<string, number> = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      const amt = t.currency === 'USD' ? Number(t.amount) * usdToCad : Number(t.amount);
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + amt;
    });
    const topCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];

    // Goal progress
    let goalProgress = null;
    if (primaryGoal) {
      const targetAmount = Number(primaryGoal.target_amount);
      let currentAmount = netWorth;
      if (primaryGoal.goal_type === 'savings') currentAmount = cashBalance;
      if (primaryGoal.goal_type === 'investment') currentAmount = investValueCAD;
      const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      goalProgress = {
        name: primaryGoal.name,
        progress: Math.round(progress),
        remaining: Math.round(targetAmount - currentAmount),
      };
    }

    // Get first name
    const firstName = profile?.full_name ? profile.full_name.split(' ')[0] : null;

    // Build concise overview string
    const overview = {
      userName: firstName,
      netWorth: Math.round(netWorth),
      cashBalance: Math.round(cashBalance),
      investmentValue: Math.round(investValueCAD),
      investmentGainPercent: Math.round(investGainPercent),
      holdingsCount: investments?.length || 0,
      thisMonth: {
        income: Math.round(monthIncome),
        expenses: Math.round(monthExpenses),
        savings: Math.round(monthSavings),
        savingsRate: Math.round(savingsRate),
        topCategory: topCategory ? { name: topCategory[0], amount: Math.round(topCategory[1]) } : null,
      },
      goal: goalProgress,
      currency: 'CAD',
    };

    return NextResponse.json(overview);

  } catch (error) {
    console.error('Overview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

