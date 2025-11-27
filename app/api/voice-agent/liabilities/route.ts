import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: assets } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('current_value', { ascending: false });

    // Get only liabilities
    const liabilities = (assets || []).filter(a => a.is_liability || a.category === 'liability');

    // Calculate totals
    const totalOwed = liabilities.reduce((sum, a) => sum + Number(a.current_value), 0);
    const totalMonthlyPayments = liabilities
      .filter(a => a.monthly_payment)
      .reduce((sum, a) => sum + Number(a.monthly_payment), 0);

    // Group by type
    const byType: Record<string, { total: number; count: number; monthlyPayments: number }> = {};
    
    liabilities.forEach(liability => {
      const type = liability.subcategory || 'other';
      if (!byType[type]) {
        byType[type] = { total: 0, count: 0, monthlyPayments: 0 };
      }
      byType[type].total += Number(liability.current_value);
      byType[type].count += 1;
      if (liability.monthly_payment) {
        byType[type].monthlyPayments += Number(liability.monthly_payment);
      }
    });

    // Calculate estimated payoff
    const estimatedPayoffMonths = totalMonthlyPayments > 0 
      ? Math.ceil(totalOwed / totalMonthlyPayments) 
      : null;
    const estimatedPayoffYears = estimatedPayoffMonths 
      ? Math.round(estimatedPayoffMonths / 12 * 10) / 10 
      : null;

    // Format liabilities for response
    const formattedLiabilities = liabilities.map(l => ({
      id: l.id,
      name: l.name,
      type: l.subcategory || 'other',
      amountOwed: Math.round(Number(l.current_value) * 100) / 100,
      interestRate: l.interest_rate ? Math.round(Number(l.interest_rate) * 100) / 100 : null,
      monthlyPayment: l.monthly_payment ? Math.round(Number(l.monthly_payment) * 100) / 100 : null,
      paymentDay: l.payment_day,
      institution: l.institution,
      linkedAssetId: l.linked_asset_id,
      estimatedPayoffMonths: l.monthly_payment && Number(l.monthly_payment) > 0
        ? Math.ceil(Number(l.current_value) / Number(l.monthly_payment))
        : null,
    }));

    // Sort by amount owed descending
    formattedLiabilities.sort((a, b) => b.amountOwed - a.amountOwed);

    // Identify highest interest rate debt
    const highestInterest = liabilities
      .filter(l => l.interest_rate)
      .sort((a, b) => Number(b.interest_rate) - Number(a.interest_rate))[0];

    // Identify largest debt
    const largestDebt = formattedLiabilities[0] || null;

    return NextResponse.json({
      liabilities: formattedLiabilities,
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalMonthlyPayments: Math.round(totalMonthlyPayments * 100) / 100,
      liabilityCount: liabilities.length,
      estimatedPayoffMonths,
      estimatedPayoffYears,
      byType: Object.entries(byType).map(([type, data]) => ({
        type,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        monthlyPayments: Math.round(data.monthlyPayments * 100) / 100,
      })),
      insights: {
        highestInterest: highestInterest ? {
          name: highestInterest.name,
          rate: Number(highestInterest.interest_rate),
          owed: Math.round(Number(highestInterest.current_value) * 100) / 100,
        } : null,
        largestDebt: largestDebt ? {
          name: largestDebt.name,
          owed: largestDebt.amountOwed,
          type: largestDebt.type,
        } : null,
        debtToPaymentRatio: totalMonthlyPayments > 0 
          ? Math.round((totalOwed / totalMonthlyPayments) * 10) / 10 
          : null,
      },
    });

  } catch (error) {
    console.error('Liabilities error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

