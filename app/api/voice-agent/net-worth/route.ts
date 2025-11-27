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
      { data: assets },
      usdCadQuote,
    ] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: true }),
      supabase.from('investments').select('*'),
      supabase.from('market_prices').select('*'),
      supabase.from('assets').select('*'),
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

    // Calculate cash balance
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        return sum + (t.currency === 'USD' ? amount * usdToCad : amount);
      }, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        return sum + (t.currency === 'USD' ? amount * usdToCad : amount);
      }, 0);

    const cashBalance = totalIncome - totalExpenses;

    // Calculate investment value (USD then convert to CAD)
    const investValueUSD = (investments || []).reduce((sum, i) => {
      const price = priceMap[i.symbol] ?? Number(i.avg_cost);
      return sum + price * Number(i.quantity);
    }, 0);
    const investValueCAD = investValueUSD * usdToCad;

    // Calculate physical assets
    const physicalAssets = (assets || []).filter(a => !a.is_liability && a.category !== 'liability');
    
    const realEstateTotal = physicalAssets
      .filter(a => a.category === 'real_estate')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const vehicleTotal = physicalAssets
      .filter(a => a.category === 'vehicle')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const retirementTotal = physicalAssets
      .filter(a => a.category === 'retirement')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const cashEquivalentTotal = physicalAssets
      .filter(a => a.category === 'cash_equivalent')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const collectiblesTotal = physicalAssets
      .filter(a => a.category === 'collectible')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const businessTotal = physicalAssets
      .filter(a => a.category === 'business')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const otherAssetsTotal = physicalAssets
      .filter(a => a.category === 'other')
      .reduce((sum, a) => sum + Number(a.current_value), 0);

    const totalPhysicalAssets = realEstateTotal + vehicleTotal + retirementTotal + 
      cashEquivalentTotal + collectiblesTotal + businessTotal + otherAssetsTotal;

    // Calculate liabilities
    const liabilities = (assets || []).filter(a => a.is_liability || a.category === 'liability');
    const liabilitiesTotal = liabilities.reduce((sum, a) => sum + Number(a.current_value), 0);
    const monthlyDebtPayments = liabilities
      .filter(a => a.monthly_payment)
      .reduce((sum, a) => sum + Number(a.monthly_payment), 0);

    // Net Worth = Cash + Investments + Physical Assets - Liabilities
    const totalAssets = cashBalance + investValueCAD + totalPhysicalAssets;
    const netWorth = totalAssets - liabilitiesTotal;

    // Asset allocation percentages
    const assetAllocation = [
      { category: 'Cash Balance', value: cashBalance, percent: totalAssets > 0 ? (cashBalance / totalAssets) * 100 : 0 },
      { category: 'Securities', value: investValueCAD, percent: totalAssets > 0 ? (investValueCAD / totalAssets) * 100 : 0 },
      { category: 'Real Estate', value: realEstateTotal, percent: totalAssets > 0 ? (realEstateTotal / totalAssets) * 100 : 0 },
      { category: 'Vehicles', value: vehicleTotal, percent: totalAssets > 0 ? (vehicleTotal / totalAssets) * 100 : 0 },
      { category: 'Retirement Accounts', value: retirementTotal, percent: totalAssets > 0 ? (retirementTotal / totalAssets) * 100 : 0 },
      { category: 'Cash & Savings', value: cashEquivalentTotal, percent: totalAssets > 0 ? (cashEquivalentTotal / totalAssets) * 100 : 0 },
      { category: 'Collectibles', value: collectiblesTotal, percent: totalAssets > 0 ? (collectiblesTotal / totalAssets) * 100 : 0 },
      { category: 'Business', value: businessTotal, percent: totalAssets > 0 ? (businessTotal / totalAssets) * 100 : 0 },
      { category: 'Other', value: otherAssetsTotal, percent: totalAssets > 0 ? (otherAssetsTotal / totalAssets) * 100 : 0 },
    ].filter(a => a.value > 0)
     .map(a => ({
       ...a,
       value: Math.round(a.value * 100) / 100,
       percent: Math.round(a.percent * 10) / 10,
     }))
     .sort((a, b) => b.value - a.value);

    return NextResponse.json({
      netWorth: Math.round(netWorth * 100) / 100,
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(liabilitiesTotal * 100) / 100,
      breakdown: {
        cashBalance: Math.round(cashBalance * 100) / 100,
        securities: Math.round(investValueCAD * 100) / 100,
        physicalAssets: Math.round(totalPhysicalAssets * 100) / 100,
        liabilities: Math.round(liabilitiesTotal * 100) / 100,
      },
      physicalAssetsBreakdown: {
        realEstate: Math.round(realEstateTotal * 100) / 100,
        vehicles: Math.round(vehicleTotal * 100) / 100,
        retirement: Math.round(retirementTotal * 100) / 100,
        cashEquivalent: Math.round(cashEquivalentTotal * 100) / 100,
        collectibles: Math.round(collectiblesTotal * 100) / 100,
        business: Math.round(businessTotal * 100) / 100,
        other: Math.round(otherAssetsTotal * 100) / 100,
      },
      assetAllocation,
      liabilityDetails: {
        total: Math.round(liabilitiesTotal * 100) / 100,
        monthlyPayments: Math.round(monthlyDebtPayments * 100) / 100,
        count: liabilities.length,
        estimatedPayoffMonths: monthlyDebtPayments > 0 
          ? Math.ceil(liabilitiesTotal / monthlyDebtPayments) 
          : null,
      },
      counts: {
        securities: (investments || []).length,
        physicalAssets: physicalAssets.length,
        liabilities: liabilities.length,
      },
      usdToCadRate: Math.round(usdToCad * 100) / 100,
    });

  } catch (error) {
    console.error('Net worth error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

