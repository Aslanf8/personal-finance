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

    // Format holdings with gains/losses
    const holdings = (investments || []).map(inv => {
      const currentPrice = priceMap[inv.symbol] ?? Number(inv.avg_cost);
      const quantity = Number(inv.quantity);
      const avgCost = Number(inv.avg_cost);
      const costBasis = avgCost * quantity;
      const currentValue = currentPrice * quantity;
      const gain = currentValue - costBasis;
      const gainPercent = costBasis > 0 ? (gain / costBasis) * 100 : 0;

      return {
        symbol: inv.symbol,
        quantity,
        avgCost: Math.round(avgCost * 100) / 100,
        currentPrice: Math.round(currentPrice * 100) / 100,
        costBasis: Math.round(costBasis * 100) / 100,
        currentValue: Math.round(currentValue * 100) / 100,
        gain: Math.round(gain * 100) / 100,
        gainPercent: Math.round(gainPercent * 10) / 10,
        assetType: inv.asset_type,
        accountLabel: inv.account_label,
      };
    });

    // Sort by value descending
    holdings.sort((a, b) => b.currentValue - a.currentValue);

    // Calculate totals (in USD)
    const totalValueUSD = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalCostUSD = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalGainUSD = totalValueUSD - totalCostUSD;

    // Group by asset type
    const byAssetType: Record<string, { value: number; count: number }> = {};
    holdings.forEach(h => {
      const type = h.assetType || 'other';
      if (!byAssetType[type]) {
        byAssetType[type] = { value: 0, count: 0 };
      }
      byAssetType[type].value += h.currentValue;
      byAssetType[type].count += 1;
    });

    // Top performers
    const topGainers = [...holdings]
      .filter(h => h.gain > 0)
      .sort((a, b) => b.gainPercent - a.gainPercent)
      .slice(0, 3);

    const topLosers = [...holdings]
      .filter(h => h.gain < 0)
      .sort((a, b) => a.gainPercent - b.gainPercent)
      .slice(0, 3);

    return NextResponse.json({
      holdings,
      totalValueUSD: Math.round(totalValueUSD * 100) / 100,
      totalValueCAD: Math.round(totalValueUSD * usdToCad * 100) / 100,
      totalCostUSD: Math.round(totalCostUSD * 100) / 100,
      totalGainUSD: Math.round(totalGainUSD * 100) / 100,
      totalGainPercent: totalCostUSD > 0 
        ? Math.round((totalGainUSD / totalCostUSD) * 1000) / 10 
        : 0,
      holdingsCount: holdings.length,
      byAssetType,
      topGainers,
      topLosers,
      usdToCadRate: Math.round(usdToCad * 100) / 100,
    });

  } catch (error) {
    console.error('Investments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

