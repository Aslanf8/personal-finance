'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { 
  UserProfileInput, 
  FinancialGoalInput, 
  GoalMilestoneInput 
} from '@/lib/types'

// ============================================
// PROFILE ACTIONS
// ============================================

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function updateProfile(input: UserProfileInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      ...input,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Profile update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = formData.get('full_name') as string
  const birthday = formData.get('birthday') as string
  const currency = formData.get('currency') as string

  // Update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      birthday,
      currency: currency || 'CAD',
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    console.error('Profile error:', profileError)
    return { success: false, error: profileError.message }
  }

  // Create primary goal if provided
  const goalName = formData.get('goal_name') as string
  const goalAmount = formData.get('goal_amount') as string
  const goalDate = formData.get('goal_date') as string

  if (goalName && goalAmount) {
    const { error: goalError } = await supabase
      .from('financial_goals')
      .insert({
        user_id: user.id,
        name: goalName,
        target_amount: parseFloat(goalAmount),
        target_date: goalDate || null,
        is_primary: true,
        goal_type: 'net_worth',
        color: 'amber',
      })

    if (goalError) {
      console.error('Goal error:', goalError)
    }
  }

  revalidatePath('/')
  redirect('/')
}

// ============================================
// FINANCIAL GOAL ACTIONS
// ============================================

export async function getGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: goals } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('display_order', { ascending: true })

  return goals || []
}

export async function getPrimaryGoal() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: goal } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  return goal
}

export async function createGoal(input: FinancialGoalInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // If this is being set as primary, unset other primary goals
  if (input.is_primary) {
    await supabase
      .from('financial_goals')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('is_primary', true)
  }

  const { data, error } = await supabase
    .from('financial_goals')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single()

  if (error) {
    console.error('Goal creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true, data }
}

export async function updateGoal(id: string, input: Partial<FinancialGoalInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // If this is being set as primary, unset other primary goals
  if (input.is_primary) {
    await supabase
      .from('financial_goals')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .neq('id', id)
  }

  const { error } = await supabase
    .from('financial_goals')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Goal update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteGoal(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('financial_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Goal deletion error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

export async function markGoalAchieved(id: string, achieved: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('financial_goals')
    .update({
      is_achieved: achieved,
      achieved_at: achieved ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

// ============================================
// MILESTONE ACTIONS
// ============================================

export async function getMilestones(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  return milestones || []
}

export async function createMilestone(input: GoalMilestoneInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('goal_milestones')
    .insert({
      user_id: user.id,
      ...input,
    })
    .select()
    .single()

  if (error) {
    console.error('Milestone creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true, data }
}

export async function updateMilestone(id: string, input: Partial<GoalMilestoneInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('goal_milestones')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteMilestone(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('goal_milestones')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

export async function markMilestoneAchieved(id: string, achieved: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('goal_milestones')
    .update({
      is_achieved: achieved,
      achieved_at: achieved ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/settings')
  return { success: true }
}

// ============================================
// HELPER ACTIONS
// ============================================

export async function getGoalWithMilestones(goalId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const [goalResult, milestonesResult] = await Promise.all([
    supabase
      .from('financial_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('goal_milestones')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .order('display_order', { ascending: true }),
  ])

  if (!goalResult.data) return null

  return {
    goal: goalResult.data,
    milestones: milestonesResult.data || [],
  }
}

export async function getPrimaryGoalWithMilestones() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: goal } = await supabase
    .from('financial_goals')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single()

  if (!goal) return null

  const { data: milestones } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goal.id)
    .eq('user_id', user.id)
    .order('display_order', { ascending: true })

  return {
    goal,
    milestones: milestones || [],
  }
}

