import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import YahooFinance from 'yahoo-finance2';
import { expandRecurringTransactions } from '@/lib/period-utils';

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
      usdCadQuote,
    ] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      supabase.from('investments').select('*'),
      supabase.from('market_prices').select('*'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      yahooFinance.quote('CAD=X').catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

    const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

    // Expand recurring transactions
    const transactions = expandRecurringTransactions(allTransactions || [], new Date());

    // Build price map
    const priceMap = (prices || []).reduce(
      (acc, p) => ({ ...acc, [p.symbol]: Number(p.price) }),
      {} as Record<string, number>
    );

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        const converted = t.currency === 'USD' ? amount * usdToCad : amount;
        return sum + converted;
      }, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        const converted = t.currency === 'USD' ? amount * usdToCad : amount;
        return sum + converted;
      }, 0);

    const cashBalance = totalIncome - totalExpenses;

    // Calculate investment values
    const investValueUSD = (investments || []).reduce((sum, i) => {
      const price = priceMap[i.symbol] ?? Number(i.avg_cost);
      return sum + price * Number(i.quantity);
    }, 0);

    const investCostUSD = (investments || []).reduce(
      (sum, i) => sum + Number(i.avg_cost) * Number(i.quantity),
      0
    );

    const investValueCAD = investValueUSD * usdToCad;
    const investCostCAD = investCostUSD * usdToCad;
    const unrealizedPL = investValueCAD - investCostCAD;
    const netWorth = cashBalance + investValueCAD;

    return NextResponse.json({
      netWorth: Math.round(netWorth * 100) / 100,
      cashBalance: Math.round(cashBalance * 100) / 100,
      investmentValue: Math.round(investValueCAD * 100) / 100,
      investmentCost: Math.round(investCostCAD * 100) / 100,
      unrealizedPL: Math.round(unrealizedPL * 100) / 100,
      unrealizedPLPercent: investCostCAD > 0 
        ? Math.round((unrealizedPL / investCostCAD) * 10000) / 100 
        : 0,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      currency: profile?.currency || 'CAD',
      usdToCadRate: Math.round(usdToCad * 100) / 100,
    });

  } catch (error) {
    console.error('Financial summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

