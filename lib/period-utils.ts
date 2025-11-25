export type Period = 'this-month' | 'last-month' | 'this-year' | 'all-time'

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

