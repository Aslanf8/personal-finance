'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

type Investment = {
  id: string
  symbol: string
  quantity: number
  avg_cost: number
  asset_type: string
  account_label?: string
}

type AccountBreakdownChartProps = {
  investments: Investment[]
  priceMap: Record<string, number>
  usdToCad: number
  cashBalance?: number
}

const ACCOUNT_COLORS: Record<string, string> = {
  'TFSA': '#10b981',
  'RRSP': '#3b82f6',
  'FHSA': '#8b5cf6',
  'Margin': '#64748b',
  'Cash': '#f59e0b',
  'Crypto': '#f97316',
  'Cash Balance': '#22c55e',
}

export function AccountBreakdownChart({ investments, priceMap, usdToCad, cashBalance = 0 }: AccountBreakdownChartProps) {
  const accountTotals = investments.reduce((acc, inv) => {
    const label = inv.account_label || 'Margin'
    const price = priceMap[inv.symbol] ?? Number(inv.avg_cost)
    const valueUSD = price * Number(inv.quantity)
    const valueCAD = valueUSD * usdToCad
    
    acc[label] = (acc[label] || 0) + valueCAD
    return acc
  }, {} as Record<string, number>)

  if (cashBalance > 0) {
    accountTotals['Cash Balance'] = cashBalance
  }

  const data = Object.entries(accountTotals)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: ACCOUNT_COLORS[name] || '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No data to display
      </div>
    )
  }

  const formatCurrency = (value: number) => 
    value.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      {/* Pie Chart */}
      <div className="relative w-[180px] h-[180px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${formatCurrency(item.value)} ({((item.value / total) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center total */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-bold">${formatCurrency(total)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full space-y-2">
        {data.map((item) => {
          const percent = ((item.value / total) * 100).toFixed(1)
          return (
            <div key={item.name} className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-sm tabular-nums text-muted-foreground flex-shrink-0">
                    {percent}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${percent}%`,
                      backgroundColor: item.color 
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums flex-shrink-0 w-24 text-right">
                ${formatCurrency(item.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
