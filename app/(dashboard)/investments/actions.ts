'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AssetCategory } from '@/lib/types'
import { LIABILITY_TO_EXPENSE_CATEGORY } from '@/lib/types'

// ============================================
// INVESTMENT ACTIONS (Stocks/Crypto)
// ============================================

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

// ============================================
// ASSET ACTIONS (Real Estate, Vehicles, Liabilities, etc.)
// ============================================

export async function addAsset(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  const category = formData.get('category') as AssetCategory
  const is_liability = category === 'liability' || formData.get('is_liability') === 'true'
  const subcategory = formData.get('subcategory') as string || null
  const name = formData.get('name') as string
  const currency = (formData.get('currency') as string) || 'CAD'
  
  // Payment tracking for liabilities
  const monthly_payment = formData.get('monthly_payment') ? parseFloat(formData.get('monthly_payment') as string) : null
  const payment_day = formData.get('payment_day') ? parseInt(formData.get('payment_day') as string) : null
  const create_recurring_transaction = formData.get('create_recurring_transaction') === 'on' || formData.get('create_recurring_transaction') === 'true'

  const assetData = {
    user_id: user.id,
    name,
    category,
    subcategory,
    current_value: parseFloat(formData.get('current_value') as string),
    purchase_price: formData.get('purchase_price') ? parseFloat(formData.get('purchase_price') as string) : null,
    purchase_date: formData.get('purchase_date') as string || null,
    currency,
    is_liability,
    interest_rate: formData.get('interest_rate') ? parseFloat(formData.get('interest_rate') as string) : null,
    address: formData.get('address') as string || null,
    property_type: formData.get('property_type') as string || null,
    make: formData.get('make') as string || null,
    model: formData.get('model') as string || null,
    year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
    description: formData.get('description') as string || null,
    notes: formData.get('notes') as string || null,
    linked_asset_id: formData.get('linked_asset_id') as string || null,
    institution: formData.get('institution') as string || null,
    monthly_payment,
    payment_day,
  }

  // Insert the asset first
  const { data: insertedAsset, error } = await supabase
    .from('assets')
    .insert(assetData)
    .select('id')
    .single()

  if (error) {
    console.error('Error adding asset:', error)
    return { success: false, error: error.message }
  }

  // If it's a liability with monthly payment and user wants recurring transaction
  if (is_liability && monthly_payment && create_recurring_transaction && insertedAsset) {
    // Determine expense category based on liability type
    const expenseCategory = LIABILITY_TO_EXPENSE_CATEGORY[subcategory || 'other'] || 'Debt Payment'
    
    // Calculate the start date for the recurring transaction
    const today = new Date()
    const paymentDayToUse = payment_day || today.getDate()
    
    // Set the date to this month's payment day, or next month if already past
    let startDate = new Date(today.getFullYear(), today.getMonth(), paymentDayToUse)
    if (startDate < today) {
      startDate = new Date(today.getFullYear(), today.getMonth() + 1, paymentDayToUse)
    }
    
    const dateString = startDate.toISOString().split('T')[0]

    // Create the recurring transaction
    const { data: insertedTransaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: monthly_payment,
        description: `${name} Payment`,
        category: expenseCategory,
        type: 'expense',
        date: dateString,
        is_recurring: true,
        recurring_frequency: 'monthly',
        currency,
        linked_asset_id: insertedAsset.id,
        notes: `Auto-created recurring payment for ${name}`,
      })
      .select('id')
      .single()

    if (transactionError) {
      console.error('Error creating recurring transaction:', transactionError)
      // Don't fail the whole operation, just log it
    } else if (insertedTransaction) {
      // Link the transaction back to the asset
      await supabase
        .from('assets')
        .update({ linked_transaction_id: insertedTransaction.id })
        .eq('id', insertedAsset.id)
    }
  }

  revalidatePath('/investments')
  revalidatePath('/transactions')
  revalidatePath('/')
  return { success: true }
}

export async function updateAsset(id: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  // First, get the existing asset to check for linked transaction
  const { data: existingAsset } = await supabase
    .from('assets')
    .select('linked_transaction_id, name')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const category = formData.get('category') as AssetCategory
  const is_liability = category === 'liability' || formData.get('is_liability') === 'true'
  const name = formData.get('name') as string
  const monthly_payment = formData.get('monthly_payment') ? parseFloat(formData.get('monthly_payment') as string) : null
  const payment_day = formData.get('payment_day') ? parseInt(formData.get('payment_day') as string) : null

  const assetData = {
    name,
    category,
    subcategory: formData.get('subcategory') as string || null,
    current_value: parseFloat(formData.get('current_value') as string),
    purchase_price: formData.get('purchase_price') ? parseFloat(formData.get('purchase_price') as string) : null,
    purchase_date: formData.get('purchase_date') as string || null,
    currency: (formData.get('currency') as string) || 'CAD',
    is_liability,
    interest_rate: formData.get('interest_rate') ? parseFloat(formData.get('interest_rate') as string) : null,
    address: formData.get('address') as string || null,
    property_type: formData.get('property_type') as string || null,
    make: formData.get('make') as string || null,
    model: formData.get('model') as string || null,
    year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
    description: formData.get('description') as string || null,
    notes: formData.get('notes') as string || null,
    linked_asset_id: formData.get('linked_asset_id') as string || null,
    institution: formData.get('institution') as string || null,
    monthly_payment,
    payment_day,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('assets')
    .update(assetData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating asset:', error)
    return { success: false, error: error.message }
  }

  // If there's a linked transaction and monthly payment changed, update the transaction
  if (existingAsset?.linked_transaction_id && monthly_payment) {
    await supabase
      .from('transactions')
      .update({
        amount: monthly_payment,
        description: `${name} Payment`,
      })
      .eq('id', existingAsset.linked_transaction_id)
      .eq('user_id', user.id)
  }

  revalidatePath('/investments')
  revalidatePath('/transactions')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAsset(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  // Get the asset to check for linked transaction
  const { data: asset } = await supabase
    .from('assets')
    .select('linked_transaction_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // First, unlink any assets that reference this one
  await supabase
    .from('assets')
    .update({ linked_asset_id: null })
    .eq('linked_asset_id', id)
    .eq('user_id', user.id)

  // Delete the linked transaction if it exists
  if (asset?.linked_transaction_id) {
    await supabase
      .from('transactions')
      .delete()
      .eq('id', asset.linked_transaction_id)
      .eq('user_id', user.id)
  }

  // Delete any transactions linked to this asset
  await supabase
    .from('transactions')
    .delete()
    .eq('linked_asset_id', id)
    .eq('user_id', user.id)

  await supabase
    .from('assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/investments')
  revalidatePath('/transactions')
  revalidatePath('/')
}

export async function updateAssetValue(id: string, newValue: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('assets')
    .update({ 
      current_value: newValue,
      updated_at: new Date().toISOString()
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
