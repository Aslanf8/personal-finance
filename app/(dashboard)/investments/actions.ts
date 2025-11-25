'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addInvestment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const symbol = (formData.get('symbol') as string).toUpperCase()
  const quantity = parseFloat(formData.get('quantity') as string)
  const avg_cost = parseFloat(formData.get('avg_cost') as string)
  const asset_type = formData.get('asset_type') as string
  const account_label = formData.get('account_label') as string || 'Margin'
  const date = formData.get('date') as string

  await supabase.from('investments').insert({
    user_id: user.id,
    symbol,
    quantity,
    avg_cost,
    asset_type,
    account_label,
    date
  })

  revalidatePath('/investments')
  revalidatePath('/')
}

export async function deleteInvestment(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  
  await supabase.from('investments').delete().eq('id', id).eq('user_id', user.id)
  revalidatePath('/investments')
  revalidatePath('/')
}

export async function updateInvestment(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  const symbol = (formData.get('symbol') as string).toUpperCase()
  const quantity = parseFloat(formData.get('quantity') as string)
  const avg_cost = parseFloat(formData.get('avg_cost') as string)
  const asset_type = formData.get('asset_type') as string
  const account_label = formData.get('account_label') as string || 'Margin'
  const date = formData.get('date') as string

  const { error } = await supabase
    .from('investments')
    .update({
      symbol,
      quantity,
      avg_cost,
      asset_type,
      account_label,
      date
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/investments')
  revalidatePath('/')
  return { success: true }
}

import YahooFinance from 'yahoo-finance2'

export async function refreshPrices(symbols: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })
  
  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol)
          return { symbol, price: quote.regularMarketPrice }
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e)
          return null
        }
      })
    )

    const updates = results
      .filter((r): r is { symbol: string; price: number } => r !== null)
      .map(r => ({
        symbol: r.symbol,
        price: r.price,
        last_updated: new Date().toISOString()
      }))

    if (updates.length > 0) {
      const { error } = await supabase
        .from('market_prices')
        .upsert(updates, { onConflict: 'symbol' })
      
      if (error) throw error
    }

    revalidatePath('/investments')
    return { success: true }
  } catch (error) {
    console.error('Failed to refresh prices:', error)
    return { success: false, error: 'Failed to update prices' }
  }
}
