import { createClient } from "@/lib/supabase/server";
import { InvestmentPortfolio } from "@/components/investment-portfolio";

export default async function InvestmentsPage() {
  const supabase = await createClient();

  const [investmentsResult, pricesResult] = await Promise.all([
    supabase.from("investments").select("*"),
    supabase.from("market_prices").select("*"),
  ]);

  const investments = investmentsResult.data || [];
  const prices = (pricesResult.data || []).reduce(
    (acc, curr) => ({
      ...acc,
      [curr.symbol]: curr.price,
    }),
    {} as Record<string, number>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Investments</h1>
      <InvestmentPortfolio
        initialInvestments={investments}
        initialPrices={prices}
      />
    </div>
  );
}
