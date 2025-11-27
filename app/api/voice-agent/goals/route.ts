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
      { data: goals },
      { data: allTransactions },
      { data: investments },
      { data: prices },
      { data: profile },
      usdCadQuote,
    ] = await Promise.all([
      supabase.from('financial_goals').select('*').eq('user_id', user.id).order('display_order'),
      supabase.from('transactions').select('*'),
      supabase.from('investments').select('*'),
      supabase.from('market_prices').select('*'),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      yahooFinance.quote('CAD=X').catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

    const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

    // Calculate current net worth for goal progress
    const transactions = expandRecurringTransactions(allTransactions || [], new Date());
    
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

    const priceMap = (prices || []).reduce(
      (acc, p) => ({ ...acc, [p.symbol]: Number(p.price) }),
      {} as Record<string, number>
    );

    const investValueUSD = (investments || []).reduce((sum, i) => {
      const price = priceMap[i.symbol] ?? Number(i.avg_cost);
      return sum + price * Number(i.quantity);
    }, 0);

    const investValueCAD = investValueUSD * usdToCad;
    const currentNetWorth = cashBalance + investValueCAD;

    // Fetch milestones for each goal
    const goalsWithProgress = await Promise.all(
      (goals || []).map(async (goal) => {
        const { data: milestones } = await supabase
          .from('goal_milestones')
          .select('*')
          .eq('goal_id', goal.id)
          .order('display_order');

        const targetAmount = Number(goal.target_amount);
        
        // Determine current amount based on goal type
        let currentAmount = currentNetWorth;
        if (goal.goal_type === 'savings') {
          currentAmount = cashBalance;
        } else if (goal.goal_type === 'investment') {
          currentAmount = investValueCAD;
        }

        const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
        const remaining = targetAmount - currentAmount;

        // Calculate days remaining
        let daysRemaining: number | null = null;
        if (goal.target_date) {
          const targetDate = new Date(goal.target_date);
          const today = new Date();
          daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: goal.id,
          name: goal.name,
          description: goal.description,
          goalType: goal.goal_type,
          targetAmount: Math.round(targetAmount * 100) / 100,
          currentAmount: Math.round(currentAmount * 100) / 100,
          progress: Math.round(progress * 10) / 10,
          remaining: Math.round(remaining * 100) / 100,
          targetDate: goal.target_date,
          targetAge: goal.target_age,
          daysRemaining,
          isPrimary: goal.is_primary,
          isAchieved: goal.is_achieved || currentAmount >= targetAmount,
          milestones: (milestones || []).map(m => ({
            name: m.name,
            targetAmount: Number(m.target_amount),
            isAchieved: m.is_achieved || currentAmount >= Number(m.target_amount),
          })),
        };
      })
    );

    const primaryGoal = goalsWithProgress.find(g => g.isPrimary);

    return NextResponse.json({
      goals: goalsWithProgress,
      primaryGoal,
      currentNetWorth: Math.round(currentNetWorth * 100) / 100,
      cashBalance: Math.round(cashBalance * 100) / 100,
      investmentValue: Math.round(investValueCAD * 100) / 100,
      birthday: profile?.birthday,
    });

  } catch (error) {
    console.error('Goals error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

