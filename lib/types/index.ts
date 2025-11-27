// User Profile Types
export interface UserProfile {
  id: string;
  updated_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  currency: 'CAD' | 'USD';
  birthday: string | null;
  onboarding_completed: boolean;
}

export interface UserProfileInput {
  full_name?: string;
  avatar_url?: string;
  currency?: 'CAD' | 'USD';
  birthday?: string;
  onboarding_completed?: boolean;
}

// Financial Goal Types
export type GoalType = 'net_worth' | 'savings' | 'investment' | 'custom';
export type GoalColor = 'amber' | 'emerald' | 'blue' | 'purple' | 'rose' | 'orange';

export interface FinancialGoal {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  target_amount: number;
  target_date: string | null;
  target_age: number | null;
  is_primary: boolean;
  is_achieved: boolean;
  achieved_at: string | null;
  display_order: number;
  goal_type: GoalType;
  color: GoalColor;
}

export interface FinancialGoalInput {
  name: string;
  description?: string;
  target_amount: number;
  target_date?: string;
  target_age?: number;
  is_primary?: boolean;
  goal_type?: GoalType;
  color?: GoalColor;
  display_order?: number;
}

// Goal Milestone Types
export interface GoalMilestone {
  id: string;
  goal_id: string;
  user_id: string;
  created_at: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  display_order: number;
  is_achieved: boolean;
  achieved_at: string | null;
}

export interface GoalMilestoneInput {
  goal_id: string;
  name: string;
  target_amount: number;
  target_date?: string;
  display_order?: number;
}

// Transaction Types (existing, for reference)
export interface Transaction {
  id: string;
  user_id: string;
  created_at: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  description: string | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  notes: string | null;
  currency: 'CAD' | 'USD';
  linked_asset_id: string | null;
}

// Scan Receipt Types
export interface ScannedTransaction {
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'income' | 'expense';
  currency: 'CAD' | 'USD';
}

export interface ScanResult {
  success: boolean;
  transactions: ScannedTransaction[];
  summary: string | null;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

// Investment Types (existing, for reference)
export interface Investment {
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

// Scan Investment Types
export interface ScannedInvestment {
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: 'stock' | 'crypto';
  account_label: string;
  date: string;
}

export interface ScanInvestmentResult {
  success: boolean;
  investments: ScannedInvestment[];
  summary: string | null;
  confidence: 'high' | 'medium' | 'low';
  error?: string;
}

// Helper type for goal progress calculation
export interface GoalProgress {
  goal: FinancialGoal;
  milestones: GoalMilestone[];
  currentAmount: number;
  progressPercent: number;
  amountRemaining: number;
  daysRemaining: number | null;
  isOnTrack: boolean;
}

// Onboarding step type
export type OnboardingStep = 'welcome' | 'profile' | 'goal' | 'milestones' | 'complete';

// Goal color configuration for UI
export const GOAL_COLORS: Record<GoalColor, { bg: string; text: string; border: string; gradient: string }> = {
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    gradient: 'from-amber-500 to-amber-400',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-teal-400',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-cyan-400',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    gradient: 'from-purple-500 to-violet-400',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    gradient: 'from-rose-500 to-pink-400',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    gradient: 'from-orange-500 to-red-400',
  },
};

// Goal type configurations
export const GOAL_TYPES: Record<GoalType, { label: string; description: string; icon: string }> = {
  net_worth: {
    label: 'Net Worth',
    description: 'Track your total net worth including all assets',
    icon: '💰',
  },
  savings: {
    label: 'Savings',
    description: 'Track your cash savings goal',
    icon: '🏦',
  },
  investment: {
    label: 'Investment',
    description: 'Track your investment portfolio value',
    icon: '📈',
  },
  custom: {
    label: 'Custom',
    description: 'Create a custom financial goal',
    icon: '🎯',
  },
};

// Asset Types (Real Estate, Vehicles, Liabilities, etc.)
export type AssetCategory = 
  | 'real_estate' 
  | 'vehicle' 
  | 'retirement' 
  | 'cash_equivalent' 
  | 'collectible' 
  | 'business' 
  | 'other' 
  | 'liability';

export type PropertyType = 
  | 'house' 
  | 'condo' 
  | 'townhouse' 
  | 'land' 
  | 'cottage' 
  | 'commercial' 
  | 'rental';

export type VehicleType = 
  | 'car' 
  | 'truck' 
  | 'suv' 
  | 'motorcycle' 
  | 'boat' 
  | 'rv' 
  | 'snowmobile' 
  | 'atv' 
  | 'other';

export type LiabilityType = 
  | 'mortgage' 
  | 'heloc' 
  | 'car_loan' 
  | 'student_loan' 
  | 'credit_card' 
  | 'personal_loan' 
  | 'line_of_credit' 
  | 'other';

export interface Asset {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  category: AssetCategory;
  subcategory: string | null;
  current_value: number;
  purchase_price: number | null;
  purchase_date: string | null;
  currency: 'CAD' | 'USD';
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
  // Payment tracking for liabilities
  monthly_payment: number | null;
  payment_day: number | null;
  linked_transaction_id: string | null;
}

export interface AssetInput {
  name: string;
  category: AssetCategory;
  subcategory?: string;
  current_value: number;
  purchase_price?: number;
  purchase_date?: string;
  currency?: 'CAD' | 'USD';
  is_liability?: boolean;
  interest_rate?: number;
  address?: string;
  property_type?: string;
  make?: string;
  model?: string;
  year?: number;
  description?: string;
  notes?: string;
  linked_asset_id?: string;
  institution?: string;
  // Payment tracking for liabilities
  monthly_payment?: number;
  payment_day?: number;
  create_recurring_transaction?: boolean;
}

// Asset Category UI Configuration
export const ASSET_CATEGORIES: Record<AssetCategory, { label: string; icon: string; color: string }> = {
  real_estate: { label: 'Real Estate', icon: '🏠', color: 'emerald' },
  vehicle: { label: 'Vehicles', icon: '🚗', color: 'blue' },
  retirement: { label: 'Retirement', icon: '🏦', color: 'purple' },
  cash_equivalent: { label: 'Cash & Savings', icon: '💵', color: 'green' },
  collectible: { label: 'Collectibles', icon: '🎨', color: 'amber' },
  business: { label: 'Business', icon: '💼', color: 'slate' },
  other: { label: 'Other Assets', icon: '📦', color: 'gray' },
  liability: { label: 'Liabilities', icon: '💳', color: 'red' },
};

export const PROPERTY_TYPES: Record<PropertyType, string> = {
  house: 'House',
  condo: 'Condo/Apartment',
  townhouse: 'Townhouse',
  land: 'Land',
  cottage: 'Cottage/Cabin',
  commercial: 'Commercial',
  rental: 'Rental Property',
};

export const VEHICLE_TYPES: Record<VehicleType, string> = {
  car: 'Car',
  truck: 'Truck',
  suv: 'SUV',
  motorcycle: 'Motorcycle',
  boat: 'Boat',
  rv: 'RV/Camper',
  snowmobile: 'Snowmobile',
  atv: 'ATV',
  other: 'Other',
};

export const LIABILITY_TYPES: Record<LiabilityType, string> = {
  mortgage: 'Mortgage',
  heloc: 'HELOC',
  car_loan: 'Car Loan',
  student_loan: 'Student Loan',
  credit_card: 'Credit Card',
  personal_loan: 'Personal Loan',
  line_of_credit: 'Line of Credit',
  other: 'Other',
};

export const CANADIAN_INSTITUTIONS = [
  'TD Bank',
  'RBC Royal Bank',
  'Scotiabank',
  'BMO',
  'CIBC',
  'National Bank',
  'Desjardins',
  'Tangerine',
  'Simplii',
  'EQ Bank',
  'Wealthsimple',
  'Questrade',
  'Other',
] as const;

export const INVESTMENT_ACCOUNT_LABELS = [
  'TFSA',
  'RRSP',
  'FHSA',
  'RESP',
  'RDSP',
  'LIRA',
  'Pension',
  'Non-Registered',
  'Margin',
  'Cash',
  'Crypto',
] as const;

// Maps liability types to expense categories for auto-created transactions
export const LIABILITY_TO_EXPENSE_CATEGORY: Record<string, string> = {
  mortgage: 'Housing',
  heloc: 'Housing',
  car_loan: 'Transportation',
  student_loan: 'Education',
  credit_card: 'Debt Payment',
  personal_loan: 'Debt Payment',
  line_of_credit: 'Debt Payment',
  other: 'Other',
};

// Common expense categories (for reference)
export const EXPENSE_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food',
  'Utilities',
  'Healthcare',
  'Insurance',
  'Education',
  'Entertainment',
  'Personal',
  'Debt Payment',
  'Savings',
  'Other',
] as const;

