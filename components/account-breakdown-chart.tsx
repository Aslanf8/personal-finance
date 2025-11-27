"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type Investment = {
  id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: string;
  account_label?: string;
};

type Asset = {
  id: string;
  name: string;
  category: string;
  current_value: number;
  is_liability: boolean;
  monthly_payment?: number | null;
};

type AccountBreakdownChartProps = {
  investments: Investment[];
  priceMap: Record<string, number>;
  usdToCad: number;
  cashBalance?: number;
  assets?: Asset[];
};

const ASSET_COLORS: Record<string, string> = {
  // Investment accounts
  TFSA: "#10b981",
  RRSP: "#3b82f6",
  FHSA: "#8b5cf6",
  RESP: "#ec4899",
  RDSP: "#14b8a6",
  LIRA: "#6366f1",
  Pension: "#0ea5e9",
  "Non-Registered": "#64748b",
  Margin: "#64748b",
  Cash: "#f59e0b",
  Crypto: "#f97316",
  // Cash balance
  "Cash Balance": "#22c55e",
  // Physical assets
  "Real Estate": "#059669",
  Vehicles: "#0284c7",
  Retirement: "#7c3aed",
  "Cash & Savings": "#16a34a",
  Collectibles: "#d97706",
  Business: "#475569",
  "Other Assets": "#6b7280",
  // Liabilities (shown as negative)
  Liabilities: "#dc2626",
};

export function AccountBreakdownChart({
  investments,
  priceMap,
  usdToCad,
  cashBalance = 0,
  assets = [],
}: AccountBreakdownChartProps) {
  // Calculate investment totals by account
  const accountTotals = investments.reduce((acc, inv) => {
    const label = inv.account_label || "Margin";
    const price = priceMap[inv.symbol] ?? Number(inv.avg_cost);
    const valueUSD = price * Number(inv.quantity);
    const valueCAD = valueUSD * usdToCad;

    acc[label] = (acc[label] || 0) + valueCAD;
    return acc;
  }, {} as Record<string, number>);

  // Add cash balance
  if (cashBalance > 0) {
    accountTotals["Cash Balance"] = cashBalance;
  }

  // Add physical assets by category
  const realEstate = assets
    .filter(a => a.category === "real_estate" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (realEstate > 0) accountTotals["Real Estate"] = realEstate;

  const vehicles = assets
    .filter(a => a.category === "vehicle" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (vehicles > 0) accountTotals["Vehicles"] = vehicles;

  const retirement = assets
    .filter(a => a.category === "retirement" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (retirement > 0) accountTotals["Retirement"] = retirement;

  const cashEquivalent = assets
    .filter(a => a.category === "cash_equivalent" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (cashEquivalent > 0) accountTotals["Cash & Savings"] = cashEquivalent;

  const collectibles = assets
    .filter(a => a.category === "collectible" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (collectibles > 0) accountTotals["Collectibles"] = collectibles;

  const business = assets
    .filter(a => a.category === "business" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (business > 0) accountTotals["Business"] = business;

  const other = assets
    .filter(a => a.category === "other" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);
  if (other > 0) accountTotals["Other Assets"] = other;

  const data = Object.entries(accountTotals)
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: ASSET_COLORS[name] || "#94a3b8",
    }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No data to display
      </div>
    );
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString("en-CA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center">
      {/* Pie Chart */}
      <div className="relative flex-shrink-0" style={{ width: 180, height: 180, minWidth: 180, minHeight: 180 }}>
        <ResponsiveContainer width={180} height={180}>
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
                  const item = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg px-3 py-2">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ${formatCurrency(item.value)} (
                        {((item.value / total) * 100).toFixed(1)}%)
                      </p>
                    </div>
                  );
                }
                return null;
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
      <div className="flex-1 w-full space-y-2 max-h-[300px] overflow-y-auto">
        {data.map((item) => {
          const percent = ((item.value / total) * 100).toFixed(1);
          return (
            <div key={item.name} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">
                    {item.name}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground flex-shrink-0">
                    {percent}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums flex-shrink-0 w-24 text-right">
                ${formatCurrency(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
