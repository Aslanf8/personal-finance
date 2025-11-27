import { createClient } from "@/lib/supabase/server";
import { DashboardCharts } from "@/components/dashboard-charts";
import { AccountBreakdownChart } from "@/components/account-breakdown-chart";
import { RecentTransactions } from "@/components/recent-transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthGoal } from "@/components/net-worth-goal";
import { PeriodSelector } from "@/components/period-selector";
import {
  type Period,
  filterTransactionsWithRecurring,
  expandRecurringTransactions,
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

  // Get user for profile data
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: allTransactions },
    { data: investments },
    { data: prices },
    { data: assets },
    profileResult,
    primaryGoalResult,
    usdCadQuote,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: true }),
    supabase.from("investments").select("*"),
    supabase.from("market_prices").select("*"),
    supabase.from("assets").select("*"),
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id || "")
      .single(),
    supabase
      .from("financial_goals")
      .select("*")
      .eq("user_id", user?.id || "")
      .eq("is_primary", true)
      .single(),
    yahooFinance.quote("CAD=X").catch(() => ({ regularMarketPrice: 1.4 })),
  ]);

  const profile = profileResult.data;
  const primaryGoal = primaryGoalResult.data;

  // Fetch milestones for primary goal if it exists
  let milestones: {
    id: string;
    goal_id: string;
    name: string;
    target_amount: number;
    target_date: string | null;
    is_achieved: boolean;
    display_order: number;
  }[] = [];
  if (primaryGoal) {
    const { data: milestonesData } = await supabase
      .from("goal_milestones")
      .select("*")
      .eq("goal_id", primaryGoal.id)
      .order("display_order", { ascending: true });
    milestones = (milestonesData || []).map((m) => ({
      id: m.id,
      goal_id: m.goal_id,
      name: m.name,
      target_amount: Number(m.target_amount),
      target_date: m.target_date,
      is_achieved: m.is_achieved,
      display_order: m.display_order || 0,
    }));
  }

  const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

  // Filter transactions by selected period for metrics (expands recurring)
  const transactions = filterTransactionsWithRecurring(
    allTransactions || [],
    period
  );

  // All-time transactions for cash balance calculation (expanded recurring transactions)
  const allTimeTransactions = expandRecurringTransactions(
    allTransactions || [],
    new Date()
  );

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

  // Calculate assets and liabilities (all stored in CAD)
  const realEstateTotal = (assets || [])
    .filter((a) => a.category === "real_estate" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const vehicleTotal = (assets || [])
    .filter((a) => a.category === "vehicle" && !a.is_liability)
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const otherAssetsTotal = (assets || [])
    .filter(
      (a) =>
        [
          "retirement",
          "cash_equivalent",
          "collectible",
          "business",
          "other",
        ].includes(a.category) && !a.is_liability
    )
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  const liabilitiesTotal = (assets || [])
    .filter((a) => a.is_liability || a.category === "liability")
    .reduce((sum, a) => sum + Number(a.current_value), 0);

  // Calculate monthly debt payments
  const monthlyDebtPayments = (assets || [])
    .filter(
      (a) => (a.is_liability || a.category === "liability") && a.monthly_payment
    )
    .reduce((sum, a) => sum + Number(a.monthly_payment), 0);

  const totalPhysicalAssets = realEstateTotal + vehicleTotal + otherAssetsTotal;

  // Cash balance is always all-time (actual money available)
  const cashBalance = allTimeIncome - allTimeExpenses;

  // Net Worth = Cash + Investments + Physical Assets - Liabilities
  const netWorth =
    cashBalance + investValueCAD + totalPhysicalAssets - liabilitiesTotal;
  const unrealizedPL_CAD = investValueCAD - investCostCAD;

  // Period savings
  const periodSavings = periodIncome - periodExpenses;
  const periodSavingsRate =
    periodIncome > 0 ? (periodSavings / periodIncome) * 100 : 0;

  // Recent transactions - sorted by date (most recent first)
  const recentTransactions = [...(allTimeTransactions || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const periodLabel = getPeriodLabel(period);

  // Transform goal for component
  const goalForComponent = primaryGoal
    ? {
        id: primaryGoal.id,
        user_id: primaryGoal.user_id,
        created_at: primaryGoal.created_at,
        updated_at: primaryGoal.updated_at,
        name: primaryGoal.name,
        description: primaryGoal.description,
        target_amount: Number(primaryGoal.target_amount),
        target_date: primaryGoal.target_date,
        target_age: primaryGoal.target_age,
        is_primary: primaryGoal.is_primary,
        is_achieved: primaryGoal.is_achieved,
        achieved_at: primaryGoal.achieved_at,
        display_order: primaryGoal.display_order || 0,
        goal_type: primaryGoal.goal_type as
          | "net_worth"
          | "savings"
          | "investment"
          | "custom",
        color: primaryGoal.color as
          | "amber"
          | "emerald"
          | "blue"
          | "purple"
          | "rose"
          | "orange",
      }
    : null;

  // Transform milestones for component
  const milestonesForComponent = milestones.map((m) => ({
    id: m.id,
    goal_id: m.goal_id,
    user_id: primaryGoal?.user_id || "",
    created_at: "",
    name: m.name,
    target_amount: m.target_amount,
    target_date: m.target_date,
    display_order: m.display_order,
    is_achieved: m.is_achieved,
    achieved_at: null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold md:text-2xl">
            {profile?.full_name
              ? `Welcome back, ${profile.full_name.split(" ")[0]}`
              : "Dashboard"}
          </h1>
          {profile?.full_name && (
            <p className="text-sm text-muted-foreground">
              Here&apos;s your financial overview
            </p>
          )}
        </div>
        <Suspense
          fallback={
            <div className="h-10 w-80 bg-muted rounded-lg animate-pulse" />
          }
        >
          <PeriodSelector />
        </Suspense>
      </div>

      {/* Net Worth Goal Tracker - Now with dynamic data */}
      <NetWorthGoal
        currentNetWorth={netWorth}
        goal={goalForComponent}
        milestones={milestonesForComponent}
        birthday={profile?.birthday || null}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">
              Net Worth 🇨🇦
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">
              $
              {netWorth.toLocaleString("en-CA", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-emerald-600">
              All Assets - Liabilities
              {liabilitiesTotal > 0
                ? ` (-$${(liabilitiesTotal / 1000).toFixed(0)}k)`
                : ""}
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

      {/* Period Income/Expense/Debt Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        {monthlyDebtPayments > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">
                Monthly Debt Payments 🇨🇦
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                $
                {monthlyDebtPayments.toLocaleString("en-CA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-amber-600">
                Included in expenses (recurring)
              </p>
            </CardContent>
          </Card>
        )}
        {totalPhysicalAssets > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">
                Physical Assets 🇨🇦
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                $
                {totalPhysicalAssets.toLocaleString("en-CA", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-blue-600">
                Real Estate, Vehicles, Other
              </p>
            </CardContent>
          </Card>
        )}
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
        <RecentTransactions
          transactions={recentTransactions}
          initialCount={8}
          loadMoreCount={10}
        />
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
            assets={assets || []}
          />
        </CardContent>
      </Card>

      {/* Liabilities Summary */}
      {liabilitiesTotal > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">
              Liabilities Overview 🇨🇦
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-red-600 mb-1">Total Owed</div>
                <div className="text-2xl font-bold text-red-700">
                  -$
                  {liabilitiesTotal.toLocaleString("en-CA", {
                    minimumFractionDigits: 0,
                  })}
                </div>
              </div>
              {monthlyDebtPayments > 0 && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="text-sm text-amber-600 mb-1">
                    Monthly Payments
                  </div>
                  <div className="text-2xl font-bold text-amber-700">
                    $
                    {monthlyDebtPayments.toLocaleString("en-CA", {
                      minimumFractionDigits: 0,
                    })}
                    /mo
                  </div>
                </div>
              )}
              {monthlyDebtPayments > 0 && liabilitiesTotal > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm text-slate-600 mb-1">
                    Est. Payoff Time
                  </div>
                  <div className="text-2xl font-bold text-slate-700">
                    {Math.ceil(liabilitiesTotal / monthlyDebtPayments)} months
                  </div>
                  <div className="text-xs text-slate-500">
                    (~{(liabilitiesTotal / monthlyDebtPayments / 12).toFixed(1)}{" "}
                    years)
                  </div>
                </div>
              )}
            </div>
            {/* Liability breakdown */}
            <div className="mt-4 space-y-2">
              {(assets || [])
                .filter((a) => a.is_liability || a.category === "liability")
                .map((liability) => (
                  <div
                    key={liability.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <div className="font-medium">{liability.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {liability.subcategory && `${liability.subcategory} • `}
                        {liability.interest_rate &&
                          `${liability.interest_rate}% APR`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-red-600">
                        -$
                        {Number(liability.current_value).toLocaleString(
                          "en-CA",
                          { minimumFractionDigits: 0 }
                        )}
                      </div>
                      {liability.monthly_payment && (
                        <div className="text-xs text-amber-600">
                          $
                          {Number(liability.monthly_payment).toLocaleString(
                            "en-CA",
                            { minimumFractionDigits: 0 }
                          )}
                          /mo
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
