"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditInvestmentDialog } from "@/components/edit-investment-dialog";
import { ScanInvestmentDialog } from "@/components/scan-investment-dialog";
import {
  addInvestment,
  deleteInvestment,
  refreshPrices,
} from "@/app/(dashboard)/investments/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scan } from "lucide-react";

type Investment = {
  id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: string;
  account_label?: string;
  date?: string;
};

const ACCOUNT_LABELS = ['Margin', 'TFSA', 'RRSP', 'FHSA', 'Cash', 'Crypto'] as const;

export function InvestmentPortfolio({
  initialInvestments,
  initialPrices = {},
  autoOpenScan = false,
}: {
  initialInvestments: Investment[];
  initialPrices?: Record<string, number>;
  autoOpenScan?: boolean;
}) {
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  // What-If Mode
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [hypotheticalPrices, setHypotheticalPrices] = useState<
    Record<string, number>
  >({});
  const [hypotheticalQuantities, setHypotheticalQuantities] = useState<
    Record<string, number>
  >({});

  // Helper to get local date string (not UTC)
  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // ... existing fetchPrices ...

  const filteredInvestments = initialInvestments
    .sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA; // Descending order
    })
    .filter((inv) =>
      inv.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const displayedInvestments = filteredInvestments.slice(0, visibleCount);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    const symbols = Array.from(
      new Set(initialInvestments.map((i) => i.symbol))
    );
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }
    // ... existing fetch logic
    try {
      const result = await refreshPrices(symbols);

      if (!result.success) {
        throw new Error(result.error || "Failed to update prices");
      }
    } catch (err) {
      console.error(err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to update prices. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update local state when initialPrices change from server revalidation
  useEffect(() => {
    if (Object.keys(initialPrices).length > 0) {
      setPrices(initialPrices);
    }
  }, [initialPrices]);

  const totalValue = initialInvestments.reduce((sum, inv) => {
    const price = prices[inv.symbol] || inv.avg_cost; // Fallback to cost if no price
    return sum + price * inv.quantity;
  }, 0);

  const totalCost = initialInvestments.reduce(
    (sum, inv) => sum + inv.avg_cost * inv.quantity,
    0
  );

  const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
  const usdToCad = 1.4; // Default fallback since we primarily operate in USD here, conversion is estimation

  const displayValue = (val: number) => {
    return currency === "CAD" ? val * usdToCad : val;
  };

  // What-If helpers
  const getEffectivePrice = (symbol: string, fallbackCost: number) => {
    if (whatIfMode && hypotheticalPrices[symbol] !== undefined) {
      return hypotheticalPrices[symbol];
    }
    return prices[symbol] || fallbackCost;
  };

  const getEffectiveQuantity = (id: string, actualQuantity: number) => {
    if (whatIfMode && hypotheticalQuantities[id] !== undefined) {
      return hypotheticalQuantities[id];
    }
    return actualQuantity;
  };

  const setHypotheticalPrice = (symbol: string, price: number) => {
    setHypotheticalPrices((prev) => ({ ...prev, [symbol]: price }));
  };

  const setHypotheticalQuantity = (id: string, quantity: number) => {
    setHypotheticalQuantities((prev) => ({ ...prev, [id]: quantity }));
  };

  const applyPercentageChange = (percent: number) => {
    const newPrices: Record<string, number> = {};
    initialInvestments.forEach((inv) => {
      const currentPrice = prices[inv.symbol] || inv.avg_cost;
      newPrices[inv.symbol] = currentPrice * (1 + percent / 100);
    });
    setHypotheticalPrices(newPrices);
  };

  const resetHypothetical = () => {
    setHypotheticalPrices({});
    setHypotheticalQuantities({});
  };

  // Calculate hypothetical values (including quantity changes)
  const hypotheticalTotalValue = initialInvestments.reduce((sum, inv) => {
    const price = getEffectivePrice(inv.symbol, inv.avg_cost);
    const quantity = getEffectiveQuantity(inv.id, inv.quantity);
    return sum + price * quantity;
  }, 0);

  // Hypothetical cost (if buying more shares at current price)
  const hypotheticalTotalCost = initialInvestments.reduce((sum, inv) => {
    const quantity = getEffectiveQuantity(inv.id, inv.quantity);
    const additionalQty = quantity - inv.quantity;
    const currentPrice = prices[inv.symbol] || inv.avg_cost;
    // Original cost + cost of additional shares at current market price
    return (
      sum +
      inv.avg_cost * inv.quantity +
      (additionalQty > 0
        ? additionalQty * currentPrice
        : additionalQty * inv.avg_cost)
    );
  }, 0);

  const hypotheticalPL = hypotheticalTotalValue - hypotheticalTotalCost;
  const hypotheticalPLPercent =
    hypotheticalTotalCost > 0
      ? (hypotheticalPL / hypotheticalTotalCost) * 100
      : 0;

  // Difference from actual
  const valueDifference = hypotheticalTotalValue - totalValue;
  const hasHypotheticalChanges =
    Object.keys(hypotheticalPrices).length > 0 ||
    Object.keys(hypotheticalQuantities).length > 0;

  // Additional investment needed
  const additionalInvestment = hypotheticalTotalCost - totalCost;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        {/* What-If Mode Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setWhatIfMode(!whatIfMode);
              if (whatIfMode) resetHypothetical();
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              whatIfMode
                ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {whatIfMode ? "🔮 What-If Mode ON" : "🔮 What-If Mode"}
          </button>
        </div>

        {/* Currency Toggle */}
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setCurrency("CAD")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              currency === "CAD"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Canadian Dollar"
          >
            🇨🇦
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              currency === "USD"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="US Dollar"
          >
            🇺🇸
          </button>
        </div>
      </div>

      {/* What-If Control Panel */}
      {whatIfMode && (
        <div className="rounded-xl border-2 border-violet-500/30 bg-gradient-to-r from-violet-50 to-purple-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-violet-900">
                Scenario Builder
              </h3>
              <p className="text-xs text-violet-600">
                Set custom prices or apply market-wide changes
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPercentageChange(-20)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              >
                -20%
              </button>
              <button
                onClick={() => applyPercentageChange(-10)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                -10%
              </button>
              <button
                onClick={() => applyPercentageChange(10)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              >
                +10%
              </button>
              <button
                onClick={() => applyPercentageChange(20)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                +20%
              </button>
              <button
                onClick={() => applyPercentageChange(50)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-200 text-emerald-800 hover:bg-emerald-300 transition-colors"
              >
                +50%
              </button>
              <button
                onClick={() => applyPercentageChange(100)}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
              >
                2x
              </button>
              {hasHypotheticalChanges && (
                <button
                  onClick={resetHypothetical}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className={
            whatIfMode && hasHypotheticalChanges
              ? "border-violet-300 bg-violet-50/50"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Portfolio Value {currency === "USD" ? "🇺🇸" : "🇨🇦"}
              {whatIfMode && hasHypotheticalChanges && (
                <span className="text-xs font-normal text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  Hypothetical
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {displayValue(
                whatIfMode ? hypotheticalTotalValue : totalValue
              ).toFixed(2)}
            </div>
            {whatIfMode && hasHypotheticalChanges && (
              <div className="mt-1 text-xs text-muted-foreground">
                Actual: ${displayValue(totalValue).toFixed(2)}
                <span
                  className={`ml-2 font-medium ${
                    valueDifference >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  ({valueDifference >= 0 ? "+" : ""}
                  {displayValue(valueDifference).toFixed(2)})
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card
          className={
            whatIfMode && additionalInvestment !== 0
              ? "border-violet-300 bg-violet-50/50"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Total Cost {currency === "USD" ? "🇺🇸" : "🇨🇦"}
              {whatIfMode && additionalInvestment !== 0 && (
                <span className="text-xs font-normal text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  Hypothetical
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {displayValue(
                whatIfMode && additionalInvestment !== 0
                  ? hypotheticalTotalCost
                  : totalCost
              ).toFixed(2)}
            </div>
            {whatIfMode && additionalInvestment !== 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                Actual: ${displayValue(totalCost).toFixed(2)}
                <span
                  className={`ml-2 font-medium ${
                    additionalInvestment >= 0
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  ({additionalInvestment >= 0 ? "+" : ""}
                  {displayValue(additionalInvestment).toFixed(2)} investment)
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card
          className={
            whatIfMode && hasHypotheticalChanges
              ? "border-violet-300 bg-violet-50/50"
              : ""
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Profit/Loss {currency === "USD" ? "🇺🇸" : "🇨🇦"}
              {whatIfMode && hasHypotheticalChanges && (
                <span className="text-xs font-normal text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                  Hypothetical
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {whatIfMode && hasHypotheticalChanges ? (
              <>
                <div
                  className={`text-2xl font-bold ${
                    hypotheticalPL >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  ${displayValue(hypotheticalPL).toFixed(2)} (
                  {hypotheticalPLPercent.toFixed(2)}%)
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Actual: ${displayValue(totalValue - totalCost).toFixed(2)} (
                  {totalCost > 0
                    ? (((totalValue - totalCost) / totalCost) * 100).toFixed(2)
                    : "0.00"}
                  %)
                </div>
              </>
            ) : (
              <div
                className={`text-2xl font-bold ${
                  totalValue - totalCost >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                ${displayValue(totalValue - totalCost).toFixed(2)} (
                {totalCost > 0
                  ? (((totalValue - totalCost) / totalCost) * 100).toFixed(2)
                  : "0.00"}
                %)
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-2">
        <ScanInvestmentDialog defaultOpen={autoOpenScan}>
          <Button variant="outline" className="gap-2">
            <Scan className="h-4 w-4" />
            Scan Investment
          </Button>
        </ScanInvestmentDialog>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={fetchPrices} disabled={loading}>
            {loading ? "Updating..." : "Refresh Prices"}
          </Button>
          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search investments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {displayedInvestments.map((inv) => {
                const actualPrice = prices[inv.symbol] || inv.avg_cost;
                const effectivePrice = getEffectivePrice(
                  inv.symbol,
                  inv.avg_cost
                );
                const effectiveQty = getEffectiveQuantity(inv.id, inv.quantity);
                const currentValue = effectivePrice * effectiveQty;
                const additionalQty = effectiveQty - inv.quantity;
                const additionalCost =
                  additionalQty > 0
                    ? additionalQty * actualPrice
                    : additionalQty * inv.avg_cost;
                const totalCostBasis =
                  inv.avg_cost * inv.quantity + additionalCost;

                const profit = currentValue - totalCostBasis;

                // Display values based on currency
                const displayCurrentValue = displayValue(currentValue);
                const displayProfit = displayValue(profit);

                const profitPercent =
                  totalCostBasis > 0 ? (profit / totalCostBasis) * 100 : 0;

                const hasCustomPrice =
                  whatIfMode && hypotheticalPrices[inv.symbol] !== undefined;
                const hasCustomQty =
                  whatIfMode && hypotheticalQuantities[inv.id] !== undefined;
                const hasAnyCustom = hasCustomPrice || hasCustomQty;
                const priceChange = hasCustomPrice
                  ? ((effectivePrice - actualPrice) / actualPrice) * 100
                  : 0;
                const qtyChange = effectiveQty - inv.quantity;

                return (
                  <div
                    key={inv.id}
                    className={`flex items-center justify-between border-b py-4 last:border-0 ${
                      hasAnyCustom
                        ? "bg-violet-50/50 -mx-4 px-4 rounded-lg"
                        : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{inv.symbol}</span>
                        {inv.account_label && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            inv.account_label === 'TFSA' ? 'bg-emerald-100 text-emerald-700' :
                            inv.account_label === 'RRSP' ? 'bg-blue-100 text-blue-700' :
                            inv.account_label === 'FHSA' ? 'bg-purple-100 text-purple-700' :
                            inv.account_label === 'Cash' ? 'bg-amber-100 text-amber-700' :
                            inv.account_label === 'Crypto' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {inv.account_label}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {inv.quantity} units @ ${inv.avg_cost}
                        {hasCustomQty && (
                          <span
                            className={`ml-1 font-medium ${
                              qtyChange >= 0
                                ? "text-emerald-600"
                                : "text-red-500"
                            }`}
                          >
                            ({qtyChange >= 0 ? "+" : ""}
                            {qtyChange})
                          </span>
                        )}
                      </div>
                      {inv.date && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Bought on: {inv.date}
                        </div>
                      )}
                      {hasCustomQty && additionalCost !== 0 && (
                        <div className="text-[10px] text-violet-600 mt-1">
                          {additionalCost > 0 ? "+" : ""}$
                          {displayValue(additionalCost).toFixed(2)} additional
                          investment
                        </div>
                      )}
                    </div>

                    {/* What-If Editors */}
                    {whatIfMode && (
                      <div className="flex gap-3 mx-4">
                        {/* Quantity Editor */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-violet-600 font-medium mb-1">
                            Qty
                          </span>
                          <input
                            type="number"
                            step="any"
                            value={
                              hypotheticalQuantities[inv.id] ?? inv.quantity
                            }
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= 0) {
                                setHypotheticalQuantity(inv.id, val);
                              }
                            }}
                            className={`w-20 h-8 px-2 text-sm text-center rounded-md border transition-colors ${
                              hasCustomQty
                                ? "border-violet-400 bg-violet-100 text-violet-900"
                                : "border-input bg-background"
                            }`}
                          />
                          {hasCustomQty && (
                            <span
                              className={`text-[10px] mt-0.5 font-medium ${
                                qtyChange >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }`}
                            >
                              {qtyChange >= 0 ? "+" : ""}
                              {qtyChange.toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* Price Editor */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-violet-600 font-medium mb-1">
                            Price
                          </span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              $
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={
                                hypotheticalPrices[inv.symbol] ?? actualPrice
                              }
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val >= 0) {
                                  setHypotheticalPrice(inv.symbol, val);
                                }
                              }}
                              className={`w-24 h-8 pl-5 pr-2 text-sm rounded-md border transition-colors ${
                                hasCustomPrice
                                  ? "border-violet-400 bg-violet-100 text-violet-900"
                                  : "border-input bg-background"
                              }`}
                            />
                          </div>
                          {hasCustomPrice && (
                            <span
                              className={`text-[10px] mt-0.5 font-medium ${
                                priceChange >= 0
                                  ? "text-emerald-600"
                                  : "text-red-500"
                              }`}
                            >
                              {priceChange >= 0 ? "+" : ""}
                              {priceChange.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div
                          className={`font-bold ${
                            hasAnyCustom ? "text-violet-700" : ""
                          }`}
                        >
                          ${displayCurrentValue.toFixed(2)}
                        </div>
                        <div
                          className={`text-sm ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {profit >= 0 ? "+" : ""}
                          {displayProfit.toFixed(2)} ({profitPercent.toFixed(2)}
                          %)
                          {!prices[inv.symbol] && !hasAnyCustom ? " (Est)" : ""}
                        </div>
                        {hasAnyCustom && (
                          <div className="text-[10px] text-muted-foreground">
                            Actual: $
                            {displayValue(actualPrice * inv.quantity).toFixed(
                              2
                            )}
                          </div>
                        )}
                      </div>
                      {!whatIfMode && (
                        <>
                          <EditInvestmentDialog investment={inv} />
                          <form action={deleteInvestment.bind(null, inv.id)}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              ✕
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredInvestments.length > visibleCount && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((prev) => prev + 20)}
                  >
                    Load More
                  </Button>
                </div>
              )}
              {initialInvestments.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  No investments yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={async (fd) => {
                  await addInvestment(fd);
                }}
                className="grid gap-4"
              >
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input
                    name="date"
                    type="date"
                    required
                    defaultValue={getLocalDateString()}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Symbol</Label>
                  <Input name="symbol" placeholder="AAPL" required />
                </div>
                <div className="grid gap-2">
                  <Label>Quantity</Label>
                  <Input name="quantity" type="number" step="any" required />
                </div>
                <div className="grid gap-2">
                  <Label>Avg Cost</Label>
                  <Input name="avg_cost" type="number" step="any" required />
                </div>
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <select
                    name="asset_type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="stock">Stock</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Account</Label>
                  <select
                    name="account_label"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {ACCOUNT_LABELS.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Add</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
