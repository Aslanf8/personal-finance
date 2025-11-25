'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const type = formData.get('type') as string
  const date = formData.get('date') as string
  const is_recurring = formData.get('is_recurring') === 'on'
  const recurring_frequency = is_recurring ? formData.get('recurring_frequency') as string : null
  const currency = formData.get('currency') as string || 'CAD'

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    amount,
    description,
    category,
    type,
    date,
    is_recurring,
    recurring_frequency,
    currency
  })

  if (error) {
    console.error(error)
    // Handle error
  }

  revalidatePath('/transactions')
  revalidatePath('/')
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
  
  revalidatePath('/transactions')
  revalidatePath('/')
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string
  const type = formData.get('type') as string
  const date = formData.get('date') as string
  const is_recurring = formData.get('is_recurring') === 'on'
  const recurring_frequency = is_recurring ? formData.get('recurring_frequency') as string : null
  const currency = formData.get('currency') as string

  const { error } = await supabase.from('transactions').update({
    amount,
    description,
    category,
    type,
    date,
    is_recurring,
    recurring_frequency,
    currency
  }).eq('id', id).eq('user_id', user.id)

  if (error) {
    console.error(error)
  }

  revalidatePath('/transactions')
  revalidatePath('/')
}

