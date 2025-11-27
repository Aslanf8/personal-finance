# Personal Finance Hub 🇨🇦

A private, customizable personal finance tracker built for Canadians who want full control over their financial data. Track your income, expenses, investments, real estate, vehicles, liabilities, and complete net worth — all in one place.

## Why This Exists

I built this because most personal finance tools out there (Yahoo Finance, Mint, etc.) weren't exactly what I wanted. They either lacked features I needed, had too many features I didn't want, or didn't let me customize things the way I preferred.

So I decided to create an open-source project that anyone — including myself — can use to build their own private, custom personal finance hub. You own your data, you control what you track, and you can customize it however you want.

## Features

### 📊 Dashboard Overview

- See your **complete net worth** including all assets and liabilities
- Real-time **USD to CAD conversion** via Yahoo Finance
- **Cash balance**, investment value, and savings at a glance
- **Period filtering**: this month, last month, this year, all-time
- **Liabilities overview** with estimated payoff timeline

### 🎯 Financial Goals & Milestones

- Set **net worth**, **savings**, **investment**, or **custom** goals
- Add milestones to track incremental progress with a visual timeline
- Choose from 6 color themes (amber, emerald, blue, purple, rose, orange)
- Age-based goal tracking with birthday integration

### 💳 Transaction Tracking

- Log **income and expenses** with categories
- Supports **recurring monthly transactions** that auto-project into the future
- Both **CAD and USD** currencies with conversion
- Categories: Housing, Transport, Food, Utilities, Insurance, Healthcare, Education, Entertainment, Personal, Debt Payment, and more

### 📸 AI Receipt Scanning

- Snap a photo or upload an image of receipts, invoices, or bank statements
- **GPT-4o-mini** extracts transaction details automatically
- Supports multiple transactions per image
- High/medium/low confidence scoring

### 📈 Investment Portfolio (Securities)

- Track **stocks, ETFs, and crypto** with real-time prices from Yahoo Finance
- Supports Canadian account types: **TFSA, RRSP, FHSA, RESP, RDSP, LIRA, Pension**
- Plus: Non-Registered, Margin, Cash, Crypto accounts
- **What-If Mode**: Simulate portfolio scenarios by adjusting prices/quantities
- **Investment scanning**: Upload brokerage screenshots to extract holdings

### 🏠 Real Estate Tracking

- Track **houses, condos, townhouses, land, cottages, commercial, and rental properties**
- Record **purchase price, current value, and address**
- See **appreciation** over time (amount and percentage)
- Link mortgages to properties

### 🚗 Vehicle Tracking

- Track **cars, trucks, SUVs, motorcycles, boats, RVs, snowmobiles, ATVs**
- Record **year, make, model**, purchase price, and current value
- Track **depreciation** or appreciation

### 📦 Other Assets

- **Retirement accounts** (external to investments)
- **Cash & Savings** (GICs, high-interest savings)
- **Collectibles** (art, watches, wine)
- **Business equity**
- **Other assets**

### 💳 Liability Tracking

- Track **mortgages, HELOC, car loans, student loans, credit cards, lines of credit**
- Record **interest rates and monthly payments**
- **Auto-create recurring expenses** when adding liabilities
- See **estimated payoff time** (months and years)
- Link liabilities to assets (mortgage → house)

### 🗣️ Voice Assistant (Dan)

- **Conversational AI** powered by OpenAI Realtime API
- Ask about your finances naturally: "What's my net worth?", "How much debt do I have?"
- Gets real-time data via 13 specialized tools:
  - Financial summary, transactions, spending breakdown
  - Investment portfolio, investment accounts
  - Physical assets, liabilities, net worth breakdown
  - Goals, recurring transactions, income breakdown
  - Monthly comparisons, user profile
- Friendly, helpful responses with context and insights

### 📊 Beautiful Charts

- **Cash flow** visualization (last 12 months)
- **Asset allocation** pie chart with all asset classes
- **Asset breakdown bar** showing portfolio composition

### 👤 User Profiles

- Personalize with your **name, birthday, and preferred currency**
- Age displayed alongside financial goals
- Guided **onboarding flow** for new users

### 🔒 Private & Secure

- Your data stays in **your Supabase database**
- No third-party tracking
- **Row Level Security** ensures users only see their own data

## Tech Stack

- **Next.js 15** — App Router, Server Components, Server Actions
- **React 19** — Latest React with concurrent features
- **TypeScript** — Strict type-safe code
- **Supabase** — Database, authentication, and Row Level Security
- **Redux Toolkit** — Client-side state management
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Radix-based UI components
- **Recharts** — Data visualization
- **Yahoo Finance API** — Real-time stock/ETF/crypto prices & USD→CAD rates
- **OpenAI API** — Receipt scanning (GPT-4o-mini) & Voice assistant (Realtime API)
- **Lucide React** — Icons

## Getting Started

### Prerequisites

- Node.js 22 or higher
- A Supabase account (free tier works great)
- OpenAI API key (for receipt scanning and voice assistant)

### Setup Steps

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/personal-finance.git
cd personal-finance
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

You can find Supabase credentials in your project settings under API.

4. **Set up the database:**

Run this SQL in your Supabase SQL editor to create the necessary tables:

```sql
-- Profiles table (extends Supabase auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  full_name text,
  avatar_url text,
  currency text default 'CAD',
  birthday date,
  onboarding_completed boolean default false
);

-- Transactions table
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  amount numeric not null,
  category text not null,
  type text check (type in ('income', 'expense')) not null,
  date date not null,
  description text,
  is_recurring boolean default false,
  recurring_frequency text,
  notes text,
  currency text default 'CAD',
  linked_asset_id uuid  -- Links payment to liability
);

-- Investments table (Securities)
create table investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  symbol text not null,
  quantity numeric not null,
  avg_cost numeric not null,
  asset_type text,
  date date,
  account_label text default 'Margin'
);

-- Assets table (Real Estate, Vehicles, Liabilities, etc.)
create table assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  name text not null,
  category text not null,  -- real_estate, vehicle, retirement, cash_equivalent, collectible, business, other, liability
  subcategory text,        -- Property type, vehicle type, liability type
  current_value numeric not null,
  purchase_price numeric,
  purchase_date date,
  currency text default 'CAD',
  is_liability boolean default false,
  interest_rate numeric,   -- For liabilities (APR)
  address text,            -- For real estate
  property_type text,      -- house, condo, townhouse, land, cottage, commercial, rental
  make text,               -- For vehicles
  model text,              -- For vehicles
  year integer,            -- For vehicles
  description text,
  notes text,
  linked_asset_id uuid references assets(id),  -- Link liability to asset (mortgage → house)
  institution text,        -- Canadian bank/institution
  monthly_payment numeric, -- For liabilities
  payment_day integer,     -- Day of month (1-31) when payment is due
  linked_transaction_id uuid  -- Links to auto-created recurring transaction
);

-- Market prices cache
create table market_prices (
  symbol text primary key,
  price numeric,
  last_updated timestamp with time zone default now()
);

-- Financial goals
create table financial_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now()),
  name text not null,
  description text,
  target_amount numeric not null,
  target_date date,
  target_age integer,
  is_primary boolean default false,
  is_achieved boolean default false,
  achieved_at timestamptz,
  display_order integer default 0,
  goal_type text not null default 'net_worth',
  color text default 'amber'
);

-- Goal milestones
create table goal_milestones (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references financial_goals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default timezone('utc'::text, now()),
  name text not null,
  target_amount numeric not null,
  target_date date,
  display_order integer default 0,
  is_achieved boolean default false,
  achieved_at timestamptz
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table investments enable row level security;
alter table assets enable row level security;
alter table financial_goals enable row level security;
alter table goal_milestones enable row level security;

-- RLS Policies
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can manage own transactions" on transactions
  for all using (auth.uid() = user_id);

create policy "Users can manage own investments" on investments
  for all using (auth.uid() = user_id);

create policy "Users can manage own assets" on assets
  for all using (auth.uid() = user_id);

create policy "Users can manage own goals" on financial_goals
  for all using (auth.uid() = user_id);

create policy "Users can manage own milestones" on goal_milestones
  for all using (auth.uid() = user_id);

create policy "Anyone can read prices" on market_prices
  for select using (true);

create policy "Anyone can update prices" on market_prices
  for all using (true);

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

5. **Run the app:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **First time setup:**

When you first log in, you'll go through a quick onboarding process where you can:

- Set your name and birthday
- Choose your preferred currency (CAD or USD)
- Create your first financial goal

After that, you're ready to start tracking your finances!

## How to Use

### Dashboard

Your financial command center. See your net worth, cash balance, investments, physical assets, and liabilities at a glance. Your primary goal progress is displayed at the top with milestones.

### Transactions

- **Add manually** — Fill in description, amount, category, and date
- **Scan receipt** — Click "Scan" to use your camera or upload an image. AI extracts the details automatically.
- **Recurring transactions** — Check "Monthly" to auto-project the transaction into future months
- **Categories** — Expenses: Housing, Transport, Food, Utilities, Insurance, Healthcare, Education, Entertainment, Personal, Debt Payment, Miscellaneous. Income: Salary, Bonus, Investment, Deposit, Other.

### Net Worth Portfolio (Investments)

The investments page is now a complete **Net Worth Portfolio** with tabs for:

**Securities Tab:**

- Add holdings with symbol, quantity, average cost, date, asset type, and account label
- Click "Refresh Prices" to fetch latest prices from Yahoo Finance
- Use the currency toggle to view in USD or CAD
- Scan brokerage screenshots to extract holdings

**Real Estate Tab:**

- Add properties (house, condo, townhouse, land, cottage, commercial, rental)
- Track purchase price, current value, and address
- See appreciation over time

**Vehicles Tab:**

- Add vehicles (car, truck, SUV, motorcycle, boat, RV, snowmobile, ATV)
- Record year, make, model, and values
- Track depreciation

**Other Assets Tab:**

- Retirement accounts, cash & savings, collectibles, business equity

**Liabilities Tab:**

- Add mortgages, HELOC, car loans, student loans, credit cards, lines of credit
- Record interest rates and monthly payments
- **Auto-create recurring expense** checkbox automatically adds the payment to your transactions
- Link liabilities to assets (e.g., mortgage → house)

### Settings

- Edit your profile (name, birthday, currency)
- Create and manage financial goals
- Add milestones to goals for incremental progress tracking
- Set a primary goal to display on the dashboard

### Voice Assistant

Click the microphone button to talk to Dan, your AI financial assistant. Ask questions like:

- "What's my net worth?"
- "How much did I spend on food this month?"
- "What's my biggest debt?"
- "Show me my investment portfolio"
- "How does this month compare to last month?"

## Account Types

Track investments across different account types:

- **TFSA** — Tax-Free Savings Account (Canada)
- **RRSP** — Registered Retirement Savings Plan (Canada)
- **FHSA** — First Home Savings Account (Canada)
- **RESP** — Registered Education Savings Plan (Canada)
- **RDSP** — Registered Disability Savings Plan (Canada)
- **LIRA** — Locked-In Retirement Account (Canada)
- **Pension** — Employer pension plans
- **Non-Registered** — Standard taxable accounts
- **Margin** — Margin trading accounts
- **Cash** — Cash holdings
- **Crypto** — Cryptocurrency

## Asset Categories

- **Real Estate** — Houses, condos, townhouses, land, cottages, commercial, rentals
- **Vehicles** — Cars, trucks, SUVs, motorcycles, boats, RVs, snowmobiles, ATVs
- **Retirement** — External retirement accounts
- **Cash & Savings** — GICs, savings accounts
- **Collectibles** — Art, watches, wine, etc.
- **Business** — Business equity
- **Other** — Miscellaneous assets

## Liability Types

- **Mortgage** — Home loans (maps to Housing expense category)
- **HELOC** — Home equity line of credit (maps to Housing)
- **Car Loan** — Vehicle financing (maps to Transportation)
- **Student Loan** — Education debt (maps to Education)
- **Credit Card** — Credit card balances (maps to Debt Payment)
- **Personal Loan** — Personal loans (maps to Debt Payment)
- **Line of Credit** — LOC balances (maps to Debt Payment)

## Canadian Institutions

Supported institutions for asset/liability tracking:

- TD Bank, RBC Royal Bank, Scotiabank, BMO, CIBC
- National Bank, Desjardins, Tangerine, Simplii, EQ Bank
- Wealthsimple, Questrade

## Net Worth Calculation

```
Net Worth = Cash Balance + Securities + Physical Assets - Liabilities

Where:
├── Cash Balance = All-time Income - All-time Expenses
├── Securities = Σ(quantity × price) × USD→CAD rate
├── Physical Assets = Real Estate + Vehicles + Retirement + Cash & Savings + Collectibles + Business + Other
└── Liabilities = Mortgages + HELOC + Car Loans + Student Loans + Credit Cards + Personal Loans + LOC
```

## Goal Types

- **Net Worth** — Track total net worth including all assets
- **Savings** — Track cash savings goal
- **Investment** — Track investment portfolio value
- **Custom** — Create any custom financial goal

## Project Structure

```
├── app/
│   ├── (dashboard)/              # Main dashboard pages (protected)
│   │   ├── page.tsx              # Dashboard home
│   │   ├── transactions/         # Transaction tracking
│   │   ├── investments/          # Net Worth Portfolio
│   │   ├── settings/             # Profile & goals management
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── dashboard-shell.tsx
│   ├── api/
│   │   ├── scan-receipt/         # OpenAI receipt scanning
│   │   ├── scan-investment/      # OpenAI investment scanning
│   │   ├── realtime-session/     # Voice agent session
│   │   └── voice-agent/          # Voice agent API endpoints
│   │       ├── financial-summary/
│   │       ├── transactions/
│   │       ├── spending/
│   │       ├── investments/
│   │       ├── accounts/
│   │       ├── assets/           # Physical assets endpoint
│   │       ├── liabilities/      # Liabilities endpoint
│   │       ├── net-worth/        # Net worth breakdown
│   │       ├── goals/
│   │       ├── recurring/
│   │       ├── income/
│   │       ├── compare/
│   │       └── profile/
│   ├── auth/
│   │   └── callback/             # Supabase auth callback
│   ├── login/                    # Login page
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── voice-agent/              # Voice assistant components
│   ├── sidebar.tsx               # Navigation sidebar
│   ├── dashboard-charts.tsx      # Cash flow chart
│   ├── account-breakdown-chart.tsx  # Asset allocation
│   ├── net-worth-goal.tsx        # Goal progress display
│   ├── transaction-form.tsx      # Add transaction form
│   ├── transaction-history.tsx
│   ├── investment-portfolio.tsx  # Net Worth Portfolio component
│   ├── add-asset-dialog.tsx      # Add asset/liability dialog
│   ├── edit-asset-dialog.tsx     # Edit asset/liability dialog
│   ├── scan-transaction-dialog.tsx  # Receipt scanner
│   ├── scan-investment-dialog.tsx   # Investment scanner
│   ├── onboarding-dialog.tsx
│   └── ...
├── lib/
│   ├── types/                    # TypeScript types
│   ├── features/                 # Redux slices
│   ├── supabase/                 # Supabase client setup
│   ├── voice-agent/              # Voice agent tools & config
│   │   ├── agent.ts              # Agent instructions
│   │   ├── tools.ts              # 13 voice agent tools
│   │   └── index.ts
│   ├── period-utils.ts           # Date range utilities
│   └── utils.ts                  # Helpers
```

## Environment Variables

| Variable                        | Required | Description                         |
| ------------------------------- | -------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Your Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Your Supabase anon/public key       |
| `OPENAI_API_KEY`                | Yes      | OpenAI API key for scanning & voice |

## Voice Agent Tools

The voice assistant has access to 13 specialized tools:

| Tool                         | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| `get_financial_summary`      | Complete financial overview with net worth       |
| `get_recent_transactions`    | Recent transactions with filtering               |
| `get_spending_breakdown`     | Spending by category for any period              |
| `get_investment_portfolio`   | Securities holdings with gains/losses            |
| `get_investment_accounts`    | Investments grouped by account type              |
| `get_physical_assets`        | Real estate, vehicles, and other physical assets |
| `get_liabilities`            | All debts with interest rates and payments       |
| `get_net_worth_breakdown`    | Complete net worth with asset allocation         |
| `get_financial_goals`        | Goals and milestone progress                     |
| `get_recurring_transactions` | Subscriptions and recurring bills                |
| `get_income_breakdown`       | Income sources by category                       |
| `get_monthly_comparison`     | Compare this month vs last month                 |
| `get_user_profile`           | User name and preferences                        |

## Contributing

This is an open-source project. Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Fork and customize for your own needs

## License

MIT License — See LICENSE file for details.

---

Built with ❤️ for Canadians who want control over their finances.
