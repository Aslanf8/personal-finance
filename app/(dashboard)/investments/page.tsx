import { createClient } from "@/lib/supabase/server";
import { InvestmentsContent } from "./investments-content";
import YahooFinance from "yahoo-finance2";

interface InvestmentsPageProps {
  searchParams: Promise<{ scan?: string; tab?: string }>;
}

export default async function InvestmentsPage({
  searchParams,
}: InvestmentsPageProps) {
  const params = await searchParams;
  const autoOpenScan = params.scan === "true";
  const initialTab = params.tab || "securities";

  const supabase = await createClient();
  const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

  const [investmentsResult, pricesResult, assetsResult, usdCadQuote] =
    await Promise.all([
      supabase.from("investments").select("*"),
      supabase.from("market_prices").select("*"),
      supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false }),
      yahooFinance.quote("CAD=X").catch(() => ({ regularMarketPrice: 1.4 })),
    ]);

  const investments = investmentsResult.data || [];
  const assets = assetsResult.data || [];
  const usdToCad = usdCadQuote.regularMarketPrice || 1.4;

  const prices = (pricesResult.data || []).reduce(
    (acc, curr) => ({
      ...acc,
      [curr.symbol]: curr.price,
    }),
    {} as Record<string, number>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Net Worth Portfolio</h1>
      <InvestmentsContent
        investments={investments}
        assets={assets}
        prices={prices}
        usdToCad={usdToCad}
        autoOpenScan={autoOpenScan}
        initialTab={initialTab}
      />
    </div>
  );
}
