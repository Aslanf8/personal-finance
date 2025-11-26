# Personal Finance Hub

A private, customizable personal finance tracker built for people who want full control over their financial data. Track your income, expenses, investments, and net worth all in one place — your way.

## Why This Exists

I built this because most personal finance tools out there (Yahoo Finance, Mint, etc.) weren't exactly what I wanted. They either lacked features I needed, had too many features I didn't want, or didn't let me customize things the way I preferred.

So I decided to create an open-source project that anyone — including myself — can use to build their own private, custom personal finance hub. You own your data, you control what you track, and you can customize it however you want.

## Features

- **Dashboard Overview** — See your net worth, cash balance, investment value, and savings at a glance. Real-time USD to CAD conversion.
- **Financial Goals & Milestones** — Set net worth, savings, investment, or custom goals. Add milestones to track progress with a visual timeline. Choose from 6 color themes.
- **Transaction Tracking** — Log income and expenses with categories. Supports recurring monthly transactions and both CAD/USD currencies.
- **AI Receipt Scanning** — Snap a photo or upload an image of receipts, invoices, or bank statements. GPT-4o-mini extracts transaction details automatically.
- **Investment Portfolio** — Track stocks and ETFs with real-time prices from Yahoo Finance. Supports multiple account types (TFSA, RRSP, FHSA, Margin, Cash, Crypto).
- **What-If Mode** — Simulate portfolio scenarios by adjusting prices and quantities to see hypothetical gains/losses.
- **Period Analysis** — Filter your finances by this month, last month, this year, or all-time.
- **Beautiful Charts** — Visualize cash flow (last 12 months) and asset allocation with interactive Recharts.
- **User Profiles** — Personalize with your name, birthday, and preferred currency. Age displayed alongside financial goals.
- **Onboarding Flow** — Guided setup for new users to configure profile and first goal.
- **Responsive Design** — Works on desktop and mobile with collapsible sidebar.
- **Private & Secure** — Your data stays in your Supabase database. No third-party tracking.

## Tech Stack

- **Next.js 16** — App Router, Server Components, Server Actions
- **React 19** — Latest React with concurrent features
- **TypeScript** — Strict type-safe code
- **Supabase** — Database, authentication, and Row Level Security
- **Redux Toolkit** — Client-side state management
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Radix-based UI components
- **Recharts** — Data visualization
- **Yahoo Finance API** — Real-time stock/ETF prices
- **OpenAI API** — Receipt scanning with GPT-4o-mini vision
- **Lucide React** — Icons

## Getting Started

### Prerequisites

- Node.js 22 or higher
- A Supabase account (free tier works great)
- OpenAI API key (optional, for receipt scanning)

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
OPENAI_API_KEY=your_openai_api_key  # Optional, for receipt scanning
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
  currency text default 'CAD'
);

-- Investments table
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

Your financial command center. See your net worth, cash balance, investments, and period savings at a glance. Your primary goal progress is displayed at the top with milestones.

### Transactions

- **Add manually** — Fill in description, amount, category, and date
- **Scan receipt** — Click "Scan" to use your camera or upload an image. AI extracts the details automatically.
- **Recurring transactions** — Check "Monthly" to auto-project the transaction into future months
- **Categories** — Expenses: Housing, Transport, Food, Utilities, Insurance, Healthcare, Saving, Personal, Entertainment, Credit, Miscellaneous. Income: Salary, Bonus, Investment, Deposit, Other.

### Investments

- Add holdings with symbol, quantity, average cost, date, asset type, and account label
- Click "Refresh Prices" to fetch latest prices from Yahoo Finance
- Use the currency toggle to view in USD or CAD
- Enable "What-If Mode" to simulate scenarios — adjust prices/quantities to see hypothetical portfolio values

### Settings

- Edit your profile (name, birthday, currency)
- Create and manage financial goals
- Add milestones to goals for incremental progress tracking
- Set a primary goal to display on the dashboard

## Account Types

Track investments across different account types:

- **Margin** — Standard brokerage account
- **TFSA** — Tax-Free Savings Account (Canada)
- **RRSP** — Registered Retirement Savings Plan (Canada)
- **FHSA** — First Home Savings Account (Canada)
- **Cash** — Cash holdings
- **Crypto** — Cryptocurrency

## Goal Types

- **Net Worth** — Track total net worth including all assets
- **Savings** — Track cash savings goal
- **Investment** — Track investment portfolio value
- **Custom** — Create any custom financial goal

## Project Structure

```
├── app/
│   ├── (dashboard)/          # Main dashboard pages (protected)
│   │   ├── page.tsx          # Dashboard home
│   │   ├── transactions/     # Transaction tracking
│   │   ├── investments/      # Investment portfolio
│   │   ├── settings/         # Profile & goals management
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   └── dashboard-shell.tsx
│   ├── api/
│   │   └── scan-receipt/     # OpenAI receipt scanning endpoint
│   ├── auth/
│   │   └── callback/         # Supabase auth callback
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── sidebar.tsx           # Navigation sidebar
│   ├── dashboard-charts.tsx  # Cash flow chart
│   ├── account-breakdown-chart.tsx  # Asset allocation
│   ├── net-worth-goal.tsx    # Goal progress display
│   ├── transaction-form.tsx  # Add transaction form
│   ├── transaction-history.tsx
│   ├── investment-portfolio.tsx
│   ├── scan-transaction-dialog.tsx  # Receipt scanner
│   ├── onboarding-dialog.tsx
│   └── ...
├── lib/
│   ├── types/                # TypeScript types
│   ├── features/             # Redux slices
│   ├── supabase/             # Supabase client setup
│   ├── period-utils.ts       # Date range utilities
│   └── utils.ts              # Helpers
```

## Environment Variables

| Variable                        | Required | Description                         |
| ------------------------------- | -------- | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Your Supabase project URL           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Your Supabase anon/public key       |
| `OPENAI_API_KEY`                | No       | OpenAI API key for receipt scanning |

## Contributing

This is an open-source project. Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Fork and customize for your own needs

## License

MIT License — See LICENSE file for details.

---
