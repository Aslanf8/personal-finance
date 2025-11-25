import { createClient } from "@/lib/supabase/server";
import { DashboardCharts } from "@/components/dashboard-charts";
import { AccountBreakdownChart } from "@/components/account-breakdown-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthGoal } from "@/components/net-worth-goal";
import { PeriodSelector } from "@/components/period-selector";
import {
  type Period,
  filterTransactionsByPeriod,
  getPeriodLabel,
} from "@/lib/period-utils";
import YahooFinance from "yahoo-finance2";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = (params.period as Period) || "this-month";

  const supabase = await createClient();
  const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  const [
    { data: allTransactions },
    { data: investments },
    { data: prices },
    usdCadQuote,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: true }),
    supabase.from("investments").select("*"),
    supabase.from("market_prices").select("*"),
    yahooFinance.quote("CAD=X").catch(() => ({ regularMarketPrice: 1.4 })),
  ]);

  const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

  // Filter transactions by selected period for metrics
  const transactions = filterTransactionsByPeriod(
    allTransactions || [],
    period
  );

  // All-time transactions for cash balance calculation
  const allTimeTransactions = allTransactions || [];

  const priceMap = (prices || []).reduce(
    (acc, p) => ({
      ...acc,
      [p.symbol]: Number(p.price),
    }),
    {} as Record<string, number>
  );

  // Period-specific income/expenses
  const periodIncome =
    transactions
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        const currency = t.currency || "CAD";
        const convertedAmount = currency === "USD" ? amount * usdToCad : amount;
        return sum + convertedAmount;
      }, 0) || 0;

  const periodExpenses =
    transactions
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        const currency = t.currency || "CAD";
        const convertedAmount = currency === "USD" ? amount * usdToCad : amount;
        return sum + convertedAmount;
      }, 0) || 0;

  // All-time totals for actual cash balance and net worth
  const allTimeIncome =
    allTimeTransactions
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        const currency = t.currency || "CAD";
        const convertedAmount = currency === "USD" ? amount * usdToCad : amount;
        return sum + convertedAmount;
      }, 0) || 0;

  const allTimeExpenses =
    allTimeTransactions
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => {
        const amount = Number(t.amount);
        const currency = t.currency || "CAD";
        const convertedAmount = currency === "USD" ? amount * usdToCad : amount;
        return sum + convertedAmount;
      }, 0) || 0;

  // Calculate investment values in USD first
  const investCostUSD =
    investments?.reduce(
      (sum, i) => sum + Number(i.avg_cost) * Number(i.quantity),
      0
    ) || 0;
  const investValueUSD =
    investments?.reduce((sum, i) => {
      const price = priceMap[i.symbol] ?? Number(i.avg_cost);
      return sum + price * Number(i.quantity);
    }, 0) || 0;

  // Convert to CAD for dashboard aggregation
  const investValueCAD = investValueUSD * usdToCad;
  const investCostCAD = investCostUSD * usdToCad;

  // Cash balance is always all-time (actual money available)
  const cashBalance = allTimeIncome - allTimeExpenses;
  const netWorth = cashBalance + investValueCAD;
  const unrealizedPL_CAD = investValueCAD - investCostCAD;

  // Period savings
  const periodSavings = periodIncome - periodExpenses;
  const periodSavingsRate =
    periodIncome > 0 ? (periodSavings / periodIncome) * 100 : 0;

  // Recent transactions - sorted by date (most recent first)
  const recentTransactions = [...(allTimeTransactions || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const periodLabel = getPeriodLabel(period);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <Suspense
          fallback={
            <div className="h-10 w-80 bg-muted rounded-lg animate-pulse" />
          }
        >
          <PeriodSelector />
        </Suspense>
      </div>

      {/* Net Worth Goal Tracker */}
      <NetWorthGoal currentNetWorth={netWorth} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Worth 🇨🇦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {netWorth.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash + Investments (1 USD = {usdToCad.toFixed(2)} CAD)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Balance 🇨🇦
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {cashBalance.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Total Income - Expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Investments (🇺🇸 ➝ 🇨🇦)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {investValueCAD.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p
              className={`text-xs ${
                unrealizedPL_CAD >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {unrealizedPL_CAD >= 0 ? "+" : ""}$
              {unrealizedPL_CAD.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              (
              {investCostCAD > 0
                ? ((unrealizedPL_CAD / investCostCAD) * 100).toFixed(1)
                : "0.0"}
              %)
            </p>
          </CardContent>
        </Card>
        <Card
          className={periodSavings >= 0 ? "border-green-200" : "border-red-200"}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {periodLabel} Savings 🇨🇦
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                periodSavings >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {periodSavings >= 0 ? "+" : ""}$
              {periodSavings.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {periodSavingsRate.toFixed(1)}% savings rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Income/Expense Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {periodLabel} Income 🇨🇦
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +$
              {periodIncome.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {periodLabel} Expenses 🇨🇦
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -$
              {periodExpenses.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Cash Flow (Last 12 Months) 🇨🇦</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardCharts
              transactions={allTimeTransactions}
              usdToCad={usdToCad}
            />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions 🇨🇦</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium leading-none truncate">
                        {t.description}
                      </p>
                      {t.is_recurring && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          Monthly
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.date).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      • {t.category}
                    </p>
                  </div>
                  <div
                    className={`ml-2 font-medium flex-shrink-0 ${
                      t.type === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}$
                    {Number(t.amount).toLocaleString("en-CA")}{" "}
                    <span className="text-sm">
                      {t.currency === "USD" ? "🇺🇸" : "🇨🇦"}
                    </span>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  No recent transactions.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Allocation 🇨🇦</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountBreakdownChart
            investments={investments || []}
            priceMap={priceMap}
            usdToCad={usdToCad}
            cashBalance={cashBalance}
          />
        </CardContent>
      </Card>
    </div>
  );
}
