import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('is_recurring', true)
      .order('amount', { ascending: false });

    const recurring = (transactions || []).map(t => ({
      description: t.description || t.category,
      amount: Number(t.amount),
      type: t.type,
      category: t.category,
      frequency: t.recurring_frequency || 'monthly',
      currency: t.currency || 'CAD',
    }));

    // Group by type
    const expenses = recurring.filter(r => r.type === 'expense');
    const income = recurring.filter(r => r.type === 'income');

    const totalRecurringExpenses = expenses.reduce((sum, r) => sum + r.amount, 0);
    const totalRecurringIncome = income.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({
      recurring,
      expenses,
      income,
      totalRecurringExpenses: Math.round(totalRecurringExpenses * 100) / 100,
      totalRecurringIncome: Math.round(totalRecurringIncome * 100) / 100,
      netRecurring: Math.round((totalRecurringIncome - totalRecurringExpenses) * 100) / 100,
      count: recurring.length,
    });

  } catch (error) {
    console.error('Recurring transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

