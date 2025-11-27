import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, currency, birthday, onboarding_completed')
      .eq('id', user.id)
      .single();

    // Calculate age if birthday is available
    let age: number | null = null;
    if (profile?.birthday) {
      const birthday = new Date(profile.birthday);
      const today = new Date();
      age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
        age--;
      }
    }

    // Get first name for friendly greeting
    const fullName = profile?.full_name || null;
    const firstName = fullName ? fullName.split(' ')[0] : null;

    return NextResponse.json({
      fullName,
      firstName,
      email: user.email,
      currency: profile?.currency || 'CAD',
      age,
      hasBirthday: !!profile?.birthday,
      onboardingCompleted: profile?.onboarding_completed || false,
    });

  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

