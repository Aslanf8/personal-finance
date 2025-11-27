export type Period = 'this-month' | 'last-month' | 'this-year' | 'all-time'

export interface RecurringTransaction {
  date: string
  is_recurring?: boolean
  recurring_frequency?: string | null
}

export function getDateRangeForPeriod(period: Period): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  switch (period) {
    case 'this-month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end: today }
    }
    case 'last-month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { start, end }
    }
    case 'this-year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end: today }
    }
    case 'all-time':
    default: {
      const start = new Date(2000, 0, 1)
      return { start, end: today }
    }
  }
}

/**
 * Expands recurring transactions into projected instances for the given date range.
 * For monthly recurring transactions, generates instances for each month from the
 * original transaction date up to the end date, using the same day-of-month.
 */
export function expandRecurringTransactions<T extends RecurringTransaction & { id?: string }>(
  transactions: T[],
  endDate: Date = new Date()
): T[] {
  const result: T[] = []
  
  for (const t of transactions) {
    const originalDate = new Date(t.date)
    
    // If not recurring or not monthly, just include the original transaction
    if (!t.is_recurring || t.recurring_frequency !== 'monthly') {
      result.push(t)
      continue
    }
    
    // For monthly recurring: generate instances from original date to endDate
    const originalDay = originalDate.getDate()
    let currentMonth = new Date(originalDate.getFullYear(), originalDate.getMonth(), 1)
    const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1)
    
    while (currentMonth <= endMonth) {
      // Calculate the actual day for this month (handle months with fewer days)
      const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()
      const dayToUse = Math.min(originalDay, daysInMonth)
      
      const projectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayToUse)
      const isOriginal = projectedDate.getTime() === originalDate.getTime()
      
      // Only include if the projected date is <= endDate
      if (projectedDate <= endDate) {
        // Generate a unique ID for projected instances: originalId-YYYY-MM
        const yearMonth = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`
        const uniqueId = isOriginal ? t.id : `${t.id}-${yearMonth}`
        
        // Format date in local time (YYYY-MM-DD), not UTC
        const year = projectedDate.getFullYear()
        const month = String(projectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(projectedDate.getDate()).padStart(2, '0')
        const dateString = `${year}-${month}-${day}`
        
        result.push({
          ...t,
          id: uniqueId,
          date: dateString,
          // Mark the original transaction vs projected copies
          _isProjected: !isOriginal,
          _originalId: t.id, // Keep reference to original for editing
        } as T)
      }
      
      // Move to next month
      currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    }
  }
  
  return result
}

export function filterTransactionsByPeriod<T extends { date: string }>(
  transactions: T[],
  period: Period
): T[] {
  const { start, end } = getDateRangeForPeriod(period)
  
  return transactions.filter((t) => {
    const date = new Date(t.date)
    return date >= start && date <= end
  })
}

/**
 * Filters transactions by period, expanding recurring transactions first.
 * This ensures that monthly recurring transactions appear in future months
 * based on their day-of-month from the original transaction date.
 */
export function filterTransactionsWithRecurring<T extends RecurringTransaction>(
  transactions: T[],
  period: Period
): T[] {
  const { end } = getDateRangeForPeriod(period)
  
  // First expand recurring transactions up to the period's end date
  const expanded = expandRecurringTransactions(transactions, end)
  
  // Then filter by the period
  return filterTransactionsByPeriod(expanded, period)
}

export function getPeriodLabel(period: Period): string {
  const { start } = getDateRangeForPeriod(period)
  
  switch (period) {
    case 'this-month':
      return start.toLocaleString('default', { month: 'long', year: 'numeric' })
    case 'last-month':
      return start.toLocaleString('default', { month: 'long', year: 'numeric' })
    case 'this-year':
      return `${start.getFullYear()}`
    case 'all-time':
      return 'All Time'
    default:
      return ''
  }
}

