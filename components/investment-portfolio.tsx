"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditInvestmentDialog } from "@/components/edit-investment-dialog";
import { ScanInvestmentDialog } from "@/components/scan-investment-dialog";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { EditAssetDialog } from "@/components/edit-asset-dialog";
import {
  addInvestment,
  deleteInvestment,
  refreshPrices,
  deleteAsset,
} from "@/app/(dashboard)/investments/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scan, Plus, TrendingUp, TrendingDown, Home, Car, Wallet, CreditCard, Package } from "lucide-react";
import type { Asset, AssetCategory, ASSET_CATEGORIES } from "@/lib/types";

type Investment = {
  id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: string;
  account_label?: string;
  date?: string;
};

type TabType = "securities" | "real_estate" | "vehicles" | "other" | "liabilities";

const TABS: { id: TabType; label: string; icon: React.ReactNode; categories: AssetCategory[] }[] = [
  { id: "securities", label: "Securities", icon: <TrendingUp className="h-4 w-4" />, categories: [] },
  { id: "real_estate", label: "Real Estate", icon: <Home className="h-4 w-4" />, categories: ["real_estate"] },
  { id: "vehicles", label: "Vehicles", icon: <Car className="h-4 w-4" />, categories: ["vehicle"] },
  { id: "other", label: "Other Assets", icon: <Package className="h-4 w-4" />, categories: ["retirement", "cash_equivalent", "collectible", "business", "other"] },
  { id: "liabilities", label: "Liabilities", icon: <CreditCard className="h-4 w-4" />, categories: ["liability"] },
];

const INVESTMENT_ACCOUNT_LABELS = ['TFSA', 'RRSP', 'FHSA', 'RESP', 'RDSP', 'LIRA', 'Pension', 'Non-Registered', 'Margin', 'Cash', 'Crypto'] as const;

export function NetWorthPortfolio({
  initialInvestments,
  initialAssets,
  initialPrices = {},
  usdToCad = 1.4,
  autoOpenScan = false,
  initialTab = "securities",
}: {
  initialInvestments: Investment[];
  initialAssets: Asset[];
  initialPrices?: Record<string, number>;
  usdToCad?: number;
  autoOpenScan?: boolean;
  initialTab?: string;
}) {
  const [prices, setPrices] = useState<Record<string, number>>(initialPrices);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType);
  const [currency, setCurrency] = useState<"USD" | "CAD">("CAD");

  // Helper to get local date string
  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Update local state when initialPrices change
  useEffect(() => {
    if (Object.keys(initialPrices).length > 0) {
      setPrices(initialPrices);
    }
  }, [initialPrices]);

  // Calculate totals
  const investmentValueUSD = initialInvestments.reduce((sum, inv) => {
    const price = prices[inv.symbol] || inv.avg_cost;
    return sum + price * inv.quantity;
  }, 0);

  const investmentCostUSD = initialInvestments.reduce(
    (sum, inv) => sum + inv.avg_cost * inv.quantity,
    0
  );

  const investmentValueCAD = investmentValueUSD * usdToCad;
  const investmentPL = investmentValueUSD - investmentCostUSD;

  // Asset totals (already in CAD from database)
  const realEstateTotal = initialAssets
    .filter(a => a.category === "real_estate" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const vehicleTotal = initialAssets
    .filter(a => a.category === "vehicle" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const otherAssetsTotal = initialAssets
    .filter(a => ["retirement", "cash_equivalent", "collectible", "business", "other"].includes(a.category) && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const liabilitiesTotal = initialAssets
    .filter(a => a.is_liability || a.category === "liability")
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const totalAssets = investmentValueCAD + realEstateTotal + vehicleTotal + otherAssetsTotal;
  const netWorth = totalAssets - liabilitiesTotal;

  const displayValue = (val: number, fromUSD = false) => {
    if (currency === "USD") {
      return fromUSD ? val : val / usdToCad;
    }
    return fromUSD ? val * usdToCad : val;
  };

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    const symbols = Array.from(new Set(initialInvestments.map((i) => i.symbol)));
    if (symbols.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const result = await refreshPrices(symbols);
      if (!result.success) {
        throw new Error(result.error || "Failed to update prices");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "Failed to update prices. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAssetsForTab = (tab: TabType) => {
    const tabConfig = TABS.find(t => t.id === tab);
    if (!tabConfig || tab === "securities") return [];
    return initialAssets.filter(a => tabConfig.categories.includes(a.category));
  };

  return (
    <div className="space-y-6">
      {/* Net Worth Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Net Worth 🇨🇦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              ${netWorth.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-emerald-600">Assets - Liabilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets 🇨🇦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalAssets.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Investments + Property + Other</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Securities (🇺🇸→🇨🇦)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${investmentValueCAD.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className={`text-xs ${investmentPL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {investmentPL >= 0 ? "+" : ""}${(investmentPL * usdToCad).toLocaleString("en-CA", { minimumFractionDigits: 2 })} unrealized
            </p>
          </CardContent>
        </Card>

        <Card className={liabilitiesTotal > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Liabilities 🇨🇦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -${liabilitiesTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Mortgages, Loans, etc.</p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown Bar */}
      {totalAssets > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-4 rounded-full overflow-hidden bg-muted">
              {investmentValueCAD > 0 && (
                <div
                  className="bg-blue-500 transition-all"
                  style={{ width: `${(investmentValueCAD / totalAssets) * 100}%` }}
                  title={`Securities: $${investmentValueCAD.toLocaleString()}`}
                />
              )}
              {realEstateTotal > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(realEstateTotal / totalAssets) * 100}%` }}
                  title={`Real Estate: $${realEstateTotal.toLocaleString()}`}
                />
              )}
              {vehicleTotal > 0 && (
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: `${(vehicleTotal / totalAssets) * 100}%` }}
                  title={`Vehicles: $${vehicleTotal.toLocaleString()}`}
                />
              )}
              {otherAssetsTotal > 0 && (
                <div
                  className="bg-purple-500 transition-all"
                  style={{ width: `${(otherAssetsTotal / totalAssets) * 100}%` }}
                  title={`Other: $${otherAssetsTotal.toLocaleString()}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Securities (${(investmentValueCAD / 1000).toFixed(0)}k)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Real Estate (${(realEstateTotal / 1000).toFixed(0)}k)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Vehicles (${(vehicleTotal / 1000).toFixed(0)}k)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span>Other (${(otherAssetsTotal / 1000).toFixed(0)}k)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((tab) => {
          const count = tab.id === "securities" 
            ? initialInvestments.length 
            : getAssetsForTab(tab.id).length;
          const value = tab.id === "securities"
            ? investmentValueCAD
            : tab.id === "real_estate"
            ? realEstateTotal
            : tab.id === "vehicles"
            ? vehicleTotal
            : tab.id === "liabilities"
            ? liabilitiesTotal
            : otherAssetsTotal;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? "bg-primary-foreground/20" : "bg-background"
                }`}>
                  {count}
                </span>
              )}
              {value > 0 && (
                <span className={`text-xs ${tab.id === "liabilities" ? "text-red-300" : ""}`}>
                  ${(value / 1000).toFixed(0)}k
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Currency Toggle */}
      <div className="flex justify-end">
        <div className="flex gap-2 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setCurrency("CAD")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              currency === "CAD"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🇨🇦 CAD
          </button>
          <button
            onClick={() => setCurrency("USD")}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              currency === "USD"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            🇺🇸 USD
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "securities" ? (
        <SecuritiesTab
          investments={initialInvestments}
          prices={prices}
          currency={currency}
          usdToCad={usdToCad}
          loading={loading}
          error={error}
          autoOpenScan={autoOpenScan}
          onRefreshPrices={fetchPrices}
          getLocalDateString={getLocalDateString}
        />
      ) : (
        <AssetsTab
          assets={getAssetsForTab(activeTab)}
          allAssets={initialAssets}
          tabType={activeTab}
          currency={currency}
          usdToCad={usdToCad}
        />
      )}
    </div>
  );
}

// Securities Tab (existing investments functionality)
function SecuritiesTab({
  investments,
  prices,
  currency,
  usdToCad,
  loading,
  error,
  autoOpenScan,
  onRefreshPrices,
  getLocalDateString,
}: {
  investments: Investment[];
  prices: Record<string, number>;
  currency: "USD" | "CAD";
  usdToCad: number;
  loading: boolean;
  error: string | null;
  autoOpenScan: boolean;
  onRefreshPrices: () => void;
  getLocalDateString: () => string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);

  const filteredInvestments = investments
    .sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    })
    .filter((inv) => inv.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

  const displayedInvestments = filteredInvestments.slice(0, visibleCount);

  const totalValue = investments.reduce((sum, inv) => {
    const price = prices[inv.symbol] || inv.avg_cost;
    return sum + price * inv.quantity;
  }, 0);

  const totalCost = investments.reduce(
    (sum, inv) => sum + inv.avg_cost * inv.quantity,
    0
  );

  const displayValue = (val: number) => {
    return currency === "CAD" ? val * usdToCad : val;
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Stock & Crypto Holdings</CardTitle>
            <div className="flex gap-2">
              <ScanInvestmentDialog defaultOpen={autoOpenScan}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Scan className="h-4 w-4" />
                  Scan
                </Button>
              </ScanInvestmentDialog>
              <Button onClick={onRefreshPrices} disabled={loading} size="sm">
                {loading ? "Updating..." : "Refresh Prices"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
            <div className="mb-4">
              <Input
                placeholder="Search by symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Value {currency === "CAD" ? "🇨🇦" : "🇺🇸"}</div>
                <div className="text-lg font-bold">${displayValue(totalValue).toLocaleString("en-CA", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Cost {currency === "CAD" ? "🇨🇦" : "🇺🇸"}</div>
                <div className="text-lg font-bold">${displayValue(totalCost).toLocaleString("en-CA", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-xs text-muted-foreground">P/L {currency === "CAD" ? "🇨🇦" : "🇺🇸"}</div>
                <div className={`text-lg font-bold ${totalValue - totalCost >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalValue - totalCost >= 0 ? "+" : ""}${displayValue(totalValue - totalCost).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {displayedInvestments.map((inv) => {
              const currentPrice = prices[inv.symbol] || inv.avg_cost;
              const currentValue = currentPrice * inv.quantity;
              const costBasis = inv.avg_cost * inv.quantity;
              const profit = currentValue - costBasis;
              const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

              return (
                <div key={inv.id} className="flex items-center justify-between border-b py-4 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{inv.symbol}</span>
                      {inv.account_label && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          inv.account_label === 'TFSA' ? 'bg-emerald-100 text-emerald-700' :
                          inv.account_label === 'RRSP' ? 'bg-blue-100 text-blue-700' :
                          inv.account_label === 'FHSA' ? 'bg-purple-100 text-purple-700' :
                          inv.account_label === 'RESP' ? 'bg-pink-100 text-pink-700' :
                          inv.account_label === 'Cash' ? 'bg-amber-100 text-amber-700' :
                          inv.account_label === 'Crypto' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {inv.account_label}
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        inv.asset_type === 'crypto' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {inv.asset_type}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {inv.quantity} units @ ${inv.avg_cost.toLocaleString()}
                    </div>
                    {inv.date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {inv.date}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="font-bold">
                        ${displayValue(currentValue).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </div>
                      <div className={`text-sm ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {profit >= 0 ? "+" : ""}${displayValue(profit).toLocaleString("en-CA", { minimumFractionDigits: 2 })} ({profitPercent.toFixed(1)}%)
                      </div>
                    </div>
                    <EditInvestmentDialog investment={inv} />
                    <form action={deleteInvestment.bind(null, inv.id)}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                        ✕
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}

            {filteredInvestments.length > visibleCount && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + 20)}>
                  Load More
                </Button>
              </div>
            )}

            {investments.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No securities yet.</p>
                <p className="text-sm">Add stocks or crypto to start tracking.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Investment Form */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Add Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addInvestment} className="grid gap-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input name="date" type="date" required defaultValue={getLocalDateString()} />
              </div>
              <div className="grid gap-2">
                <Label>Symbol</Label>
                <Input name="symbol" placeholder="AAPL, META, BTC-USD" required />
              </div>
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input name="quantity" type="number" step="any" required />
              </div>
              <div className="grid gap-2">
                <Label>Avg Cost (USD)</Label>
                <Input name="avg_cost" type="number" step="any" required />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <select
                  name="asset_type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="stock">Stock</option>
                  <option value="crypto">Crypto</option>
                  <option value="etf">ETF</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Account</Label>
                <select
                  name="account_label"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {INVESTMENT_ACCOUNT_LABELS.map((label) => (
                    <option key={label} value={label}>{label}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">Add Investment</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Assets Tab (Real Estate, Vehicles, Other, Liabilities)
function AssetsTab({
  assets,
  allAssets,
  tabType,
  currency,
  usdToCad,
}: {
  assets: Asset[];
  allAssets: Asset[];
  tabType: TabType;
  currency: "USD" | "CAD";
  usdToCad: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.address && a.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.make && a.make.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (a.model && a.model.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalValue = assets.reduce((sum, a) => sum + Number(a.current_value), 0);
  const totalPurchasePrice = assets.reduce((sum, a) => sum + (Number(a.purchase_price) || 0), 0);
  const appreciation = totalValue - totalPurchasePrice;

  const displayValue = (val: number) => {
    return currency === "USD" ? val / usdToCad : val;
  };

  const getAssetIcon = (asset: Asset) => {
    switch (asset.category) {
      case "real_estate":
        return "🏠";
      case "vehicle":
        return "🚗";
      case "retirement":
        return "🏦";
      case "cash_equivalent":
        return "💵";
      case "collectible":
        return "🎨";
      case "business":
        return "💼";
      case "liability":
        return "💳";
      default:
        return "📦";
    }
  };

  const getAssetSubtitle = (asset: Asset) => {
    if (asset.category === "real_estate" && asset.address) {
      return asset.address;
    }
    if (asset.category === "vehicle") {
      const parts = [asset.year, asset.make, asset.model].filter(Boolean);
      return parts.join(" ");
    }
    if (asset.is_liability && asset.interest_rate) {
      return `${asset.interest_rate}% interest`;
    }
    return asset.subcategory || asset.description || null;
  };

  const getLinkedAsset = (linkedId: string | null) => {
    if (!linkedId) return null;
    return allAssets.find(a => a.id === linkedId);
  };

  const tabConfig = {
    real_estate: { title: "Real Estate", emptyIcon: <Home className="h-12 w-12" />, emptyText: "Add properties like houses, condos, or land" },
    vehicles: { title: "Vehicles", emptyIcon: <Car className="h-12 w-12" />, emptyText: "Add cars, trucks, boats, or other vehicles" },
    other: { title: "Other Assets", emptyIcon: <Package className="h-12 w-12" />, emptyText: "Add retirement accounts, collectibles, or business equity" },
    liabilities: { title: "Liabilities", emptyIcon: <CreditCard className="h-12 w-12" />, emptyText: "Track mortgages, loans, and credit cards" },
  };

  const config = tabConfig[tabType as keyof typeof tabConfig];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{config.title}</CardTitle>
            <AddAssetDialog defaultCategory={tabType === "liabilities" ? "liability" : tabType === "real_estate" ? "real_estate" : tabType === "vehicles" ? "vehicle" : undefined}>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add {tabType === "liabilities" ? "Liability" : "Asset"}
              </Button>
            </AddAssetDialog>
          </CardHeader>
          <CardContent>
            {assets.length > 0 && (
              <>
                <div className="mb-4">
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground">
                      {tabType === "liabilities" ? "Total Owed" : "Current Value"} {currency === "CAD" ? "🇨🇦" : "🇺🇸"}
                    </div>
                    <div className={`text-lg font-bold ${tabType === "liabilities" ? "text-red-600" : ""}`}>
                      {tabType === "liabilities" ? "-" : ""}${displayValue(totalValue).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  {tabType !== "liabilities" && (
                    <>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground">Purchase Price {currency === "CAD" ? "🇨🇦" : "🇺🇸"}</div>
                        <div className="text-lg font-bold">${displayValue(totalPurchasePrice).toLocaleString("en-CA", { minimumFractionDigits: 2 })}</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-xs text-muted-foreground">Appreciation {currency === "CAD" ? "🇨🇦" : "🇺🇸"}</div>
                        <div className={`text-lg font-bold ${appreciation >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {appreciation >= 0 ? "+" : ""}${displayValue(appreciation).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {filteredAssets.map((asset) => {
              const linkedAsset = getLinkedAsset(asset.linked_asset_id);
              const appreciationVal = Number(asset.current_value) - (Number(asset.purchase_price) || 0);
              const appreciationPct = asset.purchase_price ? (appreciationVal / Number(asset.purchase_price)) * 100 : 0;

              return (
                <div key={asset.id} className="flex items-center justify-between border-b py-4 last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getAssetIcon(asset)}</span>
                      <span className="font-bold">{asset.name}</span>
                      {asset.property_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          {asset.property_type}
                        </span>
                      )}
                      {asset.subcategory && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {asset.subcategory}
                        </span>
                      )}
                      {asset.institution && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {asset.institution}
                        </span>
                      )}
                    </div>
                    {getAssetSubtitle(asset) && (
                      <div className="text-sm text-muted-foreground">{getAssetSubtitle(asset)}</div>
                    )}
                    {linkedAsset && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Linked to: {linkedAsset.name}
                      </div>
                    )}
                    {asset.purchase_date && (
                      <div className="text-xs text-muted-foreground">
                        Purchased: {asset.purchase_date}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`font-bold ${asset.is_liability ? "text-red-600" : ""}`}>
                        {asset.is_liability ? "-" : ""}${displayValue(Number(asset.current_value)).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </div>
                      {!asset.is_liability && asset.purchase_price && (
                        <div className={`text-sm ${appreciationVal >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {appreciationVal >= 0 ? "+" : ""}${displayValue(appreciationVal).toLocaleString("en-CA", { minimumFractionDigits: 0 })} ({appreciationPct.toFixed(1)}%)
                        </div>
                      )}
                      {asset.is_liability && (
                        <>
                          {asset.monthly_payment && (
                            <div className="text-sm text-amber-600">
                              ${displayValue(Number(asset.monthly_payment)).toLocaleString("en-CA", { minimumFractionDigits: 0 })}/mo
                            </div>
                          )}
                          {asset.interest_rate && (
                            <div className="text-xs text-muted-foreground">
                              {asset.interest_rate}% APR
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <EditAssetDialog asset={asset} allAssets={allAssets} />
                    <form action={deleteAsset.bind(null, asset.id)}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                        ✕
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}

            {assets.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <div className="opacity-20 mx-auto mb-3">{config.emptyIcon}</div>
                <p>No {config.title.toLowerCase()} yet.</p>
                <p className="text-sm">{config.emptyText}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Add Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Quick Add</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tabType === "real_estate" && (
              <>
                <AddAssetDialog defaultCategory="real_estate" defaultPropertyType="house">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏠</span> House
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="real_estate" defaultPropertyType="condo">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏢</span> Condo
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="real_estate" defaultPropertyType="land">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🌲</span> Land
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="real_estate" defaultPropertyType="cottage">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏕️</span> Cottage
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="real_estate" defaultPropertyType="rental">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏘️</span> Rental Property
                  </Button>
                </AddAssetDialog>
              </>
            )}
            {tabType === "vehicles" && (
              <>
                <AddAssetDialog defaultCategory="vehicle" defaultSubcategory="car">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🚗</span> Car
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="vehicle" defaultSubcategory="truck">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🛻</span> Truck
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="vehicle" defaultSubcategory="motorcycle">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏍️</span> Motorcycle
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="vehicle" defaultSubcategory="boat">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🚤</span> Boat
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="vehicle" defaultSubcategory="rv">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🚐</span> RV/Camper
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="vehicle" defaultSubcategory="snowmobile">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>❄️</span> Snowmobile
                  </Button>
                </AddAssetDialog>
              </>
            )}
            {tabType === "other" && (
              <>
                <AddAssetDialog defaultCategory="retirement">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏦</span> Retirement Account
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="cash_equivalent">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>💵</span> Cash / Savings
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="collectible">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🎨</span> Collectible
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="business">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>💼</span> Business Equity
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="other">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>📦</span> Other Asset
                  </Button>
                </AddAssetDialog>
              </>
            )}
            {tabType === "liabilities" && (
              <>
                <AddAssetDialog defaultCategory="liability" defaultSubcategory="mortgage">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏠</span> Mortgage
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="liability" defaultSubcategory="heloc">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🏦</span> HELOC
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="liability" defaultSubcategory="car_loan">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🚗</span> Car Loan
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="liability" defaultSubcategory="student_loan">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>🎓</span> Student Loan
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="liability" defaultSubcategory="credit_card">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>💳</span> Credit Card
                  </Button>
                </AddAssetDialog>
                <AddAssetDialog defaultCategory="liability" defaultSubcategory="line_of_credit">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <span>📝</span> Line of Credit
                  </Button>
                </AddAssetDialog>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Keep the old export name for backward compatibility
export { NetWorthPortfolio as InvestmentPortfolio };
