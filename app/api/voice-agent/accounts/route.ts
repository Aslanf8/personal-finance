import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import YahooFinance from 'yahoo-finance2';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

    const [{ data: investments }, { data: prices }, usdCadQuote] = await Promise.all([
      supabase.from('investments').select('*'),
      supabase.from('market_prices').select('*'),
      yahooFinance.quote('CAD=X').catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

    const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

    const priceMap = (prices || []).reduce(
      (acc, p) => ({ ...acc, [p.symbol]: Number(p.price) }),
      {} as Record<string, number>
    );

    // Group by account label
    const accounts: Record<string, {
      holdings: Array<{
        symbol: string;
        quantity: number;
        currentValue: number;
        gain: number;
        gainPercent: number;
      }>;
      totalValue: number;
      totalCost: number;
      totalGain: number;
    }> = {};

    (investments || []).forEach(inv => {
      const accountLabel = inv.account_label || 'Margin';
      const currentPrice = priceMap[inv.symbol] ?? Number(inv.avg_cost);
      const quantity = Number(inv.quantity);
      const avgCost = Number(inv.avg_cost);
      const costBasis = avgCost * quantity;
      const currentValue = currentPrice * quantity;
      const gain = currentValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      if (!accounts[accountLabel]) {
        accounts[accountLabel] = {
          holdings: [],
          totalValue: 0,
          totalCost: 0,
          totalGain: 0,
        };
      }

      accounts[accountLabel].holdings.push({
        symbol: inv.symbol,
        quantity,
        currentValue: Math.round(currentValue * 100) / 100,
        gain: Math.round(gain * 100) / 100,
        gainPercent: Math.round(gainPercent * 10) / 10,
      });

      accounts[accountLabel].totalValue += currentValue;
      accounts[accountLabel].totalCost += costBasis;
      accounts[accountLabel].totalGain += gain;
    });

    // Format accounts summary
    const accountSummary = Object.entries(accounts).map(([name, data]) => ({
      accountType: name,
      holdingsCount: data.holdings.length,
      totalValueUSD: Math.round(data.totalValue * 100) / 100,
      totalValueCAD: Math.round(data.totalValue * usdToCad * 100) / 100,
      totalGainUSD: Math.round(data.totalGain * 100) / 100,
      totalGainPercent: data.totalCost > 0 
        ? Math.round((data.totalGain / data.totalCost) * 1000) / 10 
        : 0,
      holdings: data.holdings,
    })).sort((a, b) => b.totalValueCAD - a.totalValueCAD);

    const totalValueCAD = accountSummary.reduce((sum, a) => sum + a.totalValueCAD, 0);

    return NextResponse.json({
      accounts: accountSummary,
      totalValueCAD: Math.round(totalValueCAD * 100) / 100,
      accountCount: accountSummary.length,
      usdToCadRate: Math.round(usdToCad * 100) / 100,
    });

  } catch (error) {
    console.error('Investment accounts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

