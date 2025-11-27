"use client";

import { NetWorthPortfolio } from "@/components/investment-portfolio";
import type { Asset, Investment } from "@/lib/types";

interface InvestmentsContentProps {
  investments: Investment[];
  assets: Asset[];
  prices: Record<string, number>;
  usdToCad: number;
  autoOpenScan: boolean;
  initialTab: string;
}

export function InvestmentsContent({
  investments,
  assets,
  prices,
  usdToCad,
  autoOpenScan,
  initialTab,
}: InvestmentsContentProps) {
  return (
    <NetWorthPortfolio
      initialInvestments={investments}
      initialAssets={assets}
      initialPrices={prices}
      usdToCad={usdToCad}
      autoOpenScan={autoOpenScan}
      initialTab={initialTab}
    />
  );
}
