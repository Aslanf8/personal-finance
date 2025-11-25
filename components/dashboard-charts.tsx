"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";

type Transaction = {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  currency?: string;
  description?: string;
  category?: string;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  _isProjected?: boolean;
  _originalId?: string;
};

type DashboardChartsProps = {
  transactions: Transaction[];
  usdToCad?: number;
};

interface MonthData {
  name: string;
  yearMonth: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  transactions: Transaction[];
  dateBreakdown: Record<string, { income: number; expense: number; count: number }>;
}

export function DashboardCharts({
  transactions,
  usdToCad = 1.4,
}: DashboardChartsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Group by YYYY-MM with detailed breakdown
  const monthlyData = transactions.reduce((acc, t) => {
    const date = new Date(t.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const dayKey = date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });

    const amount = Number(t.amount);
    const currency = t.currency || "CAD";
    const convertedAmount = currency === "USD" ? amount * usdToCad : amount;

    if (!acc[yearMonth]) {
      acc[yearMonth] = {
        income: 0,
        expense: 0,
        incomeCount: 0,
        expenseCount: 0,
        transactions: [],
        dateBreakdown: {},
      };
    }

    // Initialize date breakdown if needed
    if (!acc[yearMonth].dateBreakdown[dayKey]) {
      acc[yearMonth].dateBreakdown[dayKey] = { income: 0, expense: 0, count: 0 };
    }

    if (t.type === "income") {
      acc[yearMonth].income += convertedAmount;
      acc[yearMonth].incomeCount++;
      acc[yearMonth].dateBreakdown[dayKey].income += convertedAmount;
    } else {
      acc[yearMonth].expense += convertedAmount;
      acc[yearMonth].expenseCount++;
      acc[yearMonth].dateBreakdown[dayKey].expense += convertedAmount;
    }
    acc[yearMonth].dateBreakdown[dayKey].count++;
    acc[yearMonth].transactions.push({ ...t, amount: convertedAmount });

    return acc;
  }, {} as Record<string, {
    income: number;
    expense: number;
    incomeCount: number;
    expenseCount: number;
    transactions: Transaction[];
    dateBreakdown: Record<string, { income: number; expense: number; count: number }>;
  }>);

  // Convert to array and sort chronologically
  const data: MonthData[] = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, values]) => {
      const [year, month] = yearMonth.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      const label = date.toLocaleString("default", { month: "short", year: "2-digit" });

      return {
        name: label,
        yearMonth,
        income: Math.round(values.income * 100) / 100,
        expense: Math.round(values.expense * 100) / 100,
        net: Math.round((values.income - values.expense) * 100) / 100,
        transactionCount: values.incomeCount + values.expenseCount,
        incomeCount: values.incomeCount,
        expenseCount: values.expenseCount,
        transactions: values.transactions,
        dateBreakdown: values.dateBreakdown,
      };
    })
    .slice(-12);

  const selectedData = selectedMonth 
    ? data.find(d => d.yearMonth === selectedMonth) 
    : null;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
        <Calendar className="h-12 w-12 mb-3 opacity-50" />
        <p>No transaction data to display</p>
      </div>
    );
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null;

    const monthData = data.find(d => d.name === label);
    if (!monthData) return null;

    // Sort date breakdown by date
    const sortedDates = Object.entries(monthData.dateBreakdown)
      .sort(([a], [b]) => {
        const dateA = new Date(a + ", 2024");
        const dateB = new Date(b + ", 2024");
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 8); // Show max 8 dates in tooltip

    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-xl p-4 min-w-[280px]">
        <div className="flex items-center justify-between mb-3 pb-2 border-b">
          <span className="font-semibold text-slate-800">{label}</span>
          <span className="text-xs text-muted-foreground">
            {monthData.transactionCount} transactions
          </span>
        </div>
        
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-emerald-50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium mb-0.5">
              <ArrowUpRight className="h-3 w-3" />
              Income ({monthData.incomeCount})
            </div>
            <div className="text-emerald-700 font-semibold">
              ${monthData.income.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-2">
            <div className="flex items-center gap-1 text-red-600 text-xs font-medium mb-0.5">
              <ArrowDownRight className="h-3 w-3" />
              Expenses ({monthData.expenseCount})
            </div>
            <div className="text-red-700 font-semibold">
              ${monthData.expense.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Net */}
        <div className={`rounded-lg p-2 mb-3 ${monthData.net >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Net Cash Flow</span>
            <span className={`font-bold ${monthData.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {monthData.net >= 0 ? '+' : ''}${monthData.net.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Date Breakdown */}
        {sortedDates.length > 0 && (
          <div>
            <div className="text-xs font-medium text-slate-500 mb-2">By Date</div>
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {sortedDates.map(([dateKey, dateData]) => (
                <div key={dateKey} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50">
                  <span className="text-slate-600 font-medium">{dateKey}</span>
                  <div className="flex items-center gap-3">
                    {dateData.income > 0 && (
                      <span className="text-emerald-600">+${dateData.income.toLocaleString("en-CA", { maximumFractionDigits: 0 })}</span>
                    )}
                    {dateData.expense > 0 && (
                      <span className="text-red-600">-${dateData.expense.toLocaleString("en-CA", { maximumFractionDigits: 0 })}</span>
                    )}
                    <span className="text-slate-400">({dateData.count})</span>
                  </div>
                </div>
              ))}
              {Object.keys(monthData.dateBreakdown).length > 8 && (
                <div className="text-xs text-center text-muted-foreground pt-1">
                  +{Object.keys(monthData.dateBreakdown).length - 8} more dates
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calculate average net flow for reference line
  const avgNet = data.reduce((sum, d) => sum + d.net, 0) / data.length;

  return (
    <div className="w-full space-y-4">
      {/* Chart */}
      <div style={{ minHeight: 320, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart 
            data={data} 
            onClick={(e) => {
              const chartState = e as { activePayload?: Array<{ payload: MonthData }> };
              if (chartState?.activePayload?.[0]?.payload) {
                const clicked = chartState.activePayload[0].payload;
                setSelectedMonth(selectedMonth === clicked.yearMonth ? null : clicked.yearMonth);
              }
            }}
          >
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) =>
                `$${Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
            />
            <ReferenceLine y={0} stroke="#e2e8f0" />
            <Bar
              dataKey="income"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              name="Income"
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell 
                  key={entry.yearMonth} 
                  fill={selectedMonth === entry.yearMonth ? "#15803d" : "#22c55e"}
                  opacity={selectedMonth && selectedMonth !== entry.yearMonth ? 0.5 : 1}
                />
              ))}
            </Bar>
            <Bar
              dataKey="expense"
              fill="#ef4444"
              radius={[4, 4, 0, 0]}
              name="Expenses"
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell 
                  key={entry.yearMonth} 
                  fill={selectedMonth === entry.yearMonth ? "#b91c1c" : "#ef4444"}
                  opacity={selectedMonth && selectedMonth !== entry.yearMonth ? 0.5 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {data.slice(-3).reverse().map((month) => (
          <button
            key={month.yearMonth}
            onClick={() => setSelectedMonth(selectedMonth === month.yearMonth ? null : month.yearMonth)}
            className={`p-3 rounded-lg border text-left transition-all hover:shadow-md ${
              selectedMonth === month.yearMonth 
                ? 'border-slate-400 bg-slate-50 shadow-sm' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">{month.name}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {month.transactionCount}
              </span>
            </div>
            <div className={`text-lg font-bold flex items-center gap-1 ${
              month.net >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {month.net >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {month.net >= 0 ? '+' : ''}${Math.abs(month.net).toLocaleString("en-CA", { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px]">
              <span className="text-emerald-600">↑${month.income.toLocaleString("en-CA", { maximumFractionDigits: 0 })}</span>
              <span className="text-red-600">↓${month.expense.toLocaleString("en-CA", { maximumFractionDigits: 0 })}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Expanded Month Detail */}
      {selectedData && (
        <div className="border rounded-xl p-4 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-800">{selectedData.name} Breakdown</h4>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close ✕
            </button>
          </div>
          
          {/* Date-by-date breakdown */}
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {Object.entries(selectedData.dateBreakdown)
              .sort(([a], [b]) => {
                const dateA = new Date(a + ", 2024");
                const dateB = new Date(b + ", 2024");
                return dateA.getTime() - dateB.getTime();
              })
              .map(([dateKey, dateData]) => {
                const dayNet = dateData.income - dateData.expense;
                return (
                  <div 
                    key={dateKey} 
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-700 w-20">{dateKey}</div>
                      <span className="text-xs text-muted-foreground">
                        {dateData.count} txn{dateData.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {dateData.income > 0 && (
                        <span className="text-sm text-emerald-600 font-medium">
                          +${dateData.income.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      {dateData.expense > 0 && (
                        <span className="text-sm text-red-600 font-medium">
                          -${dateData.expense.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <div className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        dayNet >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {dayNet >= 0 ? '+' : ''}{dayNet.toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
