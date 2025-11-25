'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

type Transaction = {
  id: string
  date: string
  type: 'income' | 'expense'
  amount: number
  currency?: string
  description?: string
  category?: string
}

type DashboardChartsProps = {
  transactions: Transaction[]
  usdToCad?: number
}

export function DashboardCharts({ transactions, usdToCad = 1.40 }: DashboardChartsProps) {
  // Group by YYYY-MM to handle multiple years correctly
  const monthlyData = transactions.reduce((acc, t) => {
    const date = new Date(t.date)
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    const amount = Number(t.amount)
    const currency = t.currency || 'CAD'
    const convertedAmount = currency === 'USD' ? amount * usdToCad : amount

    if (!acc[yearMonth]) {
      acc[yearMonth] = { income: 0, expense: 0 }
    }
    
    if (t.type === 'income') {
      acc[yearMonth].income += convertedAmount
    } else {
      acc[yearMonth].expense += convertedAmount
    }
    
    return acc
  }, {} as Record<string, { income: number; expense: number }>)

  // Convert to array and sort chronologically
  const data = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, values]) => {
      const [year, month] = yearMonth.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1)
      const label = date.toLocaleString('default', { month: 'short', year: '2-digit' })
      
      return {
        name: label,
        yearMonth,
        income: Math.round(values.income * 100) / 100,
        expense: Math.round(values.expense * 100) / 100,
      }
    })
    .slice(-12) // Show last 12 months max

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        No transaction data to display
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis 
          dataKey="name" 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="#888888" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`} 
        />
        <Tooltip 
          formatter={(value: number) => [`$${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, undefined]}
          labelFormatter={(label) => label}
        />
        <Legend />
        <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} name="Income (CAD)" />
        <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expense (CAD)" />
      </BarChart>
    </ResponsiveContainer>
  )
}
