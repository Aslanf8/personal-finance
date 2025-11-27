// Plaid Item (connected institution)
export interface PlaidItem {
  id: string;
  user_id: string;
  item_id: string;
  access_token: string;
  institution_id: string | null;
  institution_name: string | null;
  cursor: string | null;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
  status: 'active' | 'error' | 'disconnected';
}

// Plaid Account (individual bank account)
export interface PlaidAccount {
  id: string;
  user_id: string;
  plaid_item_id: string;
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
  is_hidden: boolean;
}

// For displaying connected accounts with institution info
export interface ConnectedAccount extends PlaidAccount {
  institution_name: string | null;
  item_status: string;
  last_synced_at: string | null;
}

// API Response types
export interface CreateLinkTokenResponse {
  link_token: string;
  expiration: string;
}

export interface ExchangeTokenResponse {
  success: boolean;
  item_id: string;
  accounts: PlaidAccount[];
}

export interface SyncResponse {
  success: boolean;
  accounts_updated: number;
  transactions_added?: number;
  transactions_modified?: number;
  transactions_removed?: number;
}

// Plaid transaction from API (simplified)
export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  pending: boolean;
  iso_currency_code: string | null;
}

// Plaid investment holding
export interface PlaidHolding {
  account_id: string;
  security_id: string;
  quantity: number;
  cost_basis: number | null;
  institution_value: number;
}

// Plaid security (stock, ETF, etc.)
export interface PlaidSecurity {
  security_id: string;
  ticker_symbol: string | null;
  name: string;
  type: string;
  close_price: number | null;
}

// Plaid liability account
export interface PlaidLiability {
  account_id: string;
  type: string;
  current_balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  next_payment_due_date: string | null;
}

