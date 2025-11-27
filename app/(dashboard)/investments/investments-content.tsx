"use client";

import { NetWorthPortfolio } from "@/components/investment-portfolio";

interface Investment {
  id: string;
  user_id: string;
  created_at: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: string;
  date: string | null;
  account_label: string | null;
}

interface Asset {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  category: string;
  subcategory: string | null;
  current_value: number;
  purchase_price: number | null;
  purchase_date: string | null;
  currency: string;
  is_liability: boolean;
  interest_rate: number | null;
  address: string | null;
  property_type: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  description: string | null;
  notes: string | null;
  linked_asset_id: string | null;
  institution: string | null;
  monthly_payment: number | null;
  payment_day: number | null;
  linked_transaction_id: string | null;
}

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

