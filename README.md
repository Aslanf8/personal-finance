# Personal Finance Tracker

A modern personal finance dashboard built with Next.js 16, Supabase, and TypeScript. Track your income, expenses, investments, and net worth all in one place.

## Features

- **Dashboard Overview** — View net worth, cash balance, investment value, and savings at a glance
- **Transaction Tracking** — Log income and expenses with categories and multi-currency support (CAD/USD)
- **Investment Portfolio** — Track stocks and ETFs with real-time prices via Yahoo Finance
- **Period Filtering** — Analyze finances by month, quarter, year, or all-time
- **Net Worth Goal** — Set and track progress toward your financial goals
- **Charts & Visualizations** — Beautiful charts powered by Recharts

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database & Auth:** Supabase
- **State Management:** Redux Toolkit
- **UI Components:** shadcn/ui + Radix primitives
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Market Data:** Yahoo Finance API
- **Language:** TypeScript (strict)

## Getting Started

### Prerequisites

- Node.js 22+ (recommended for Yahoo Finance compatibility)
- A Supabase project

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/personal-finance.git
cd personal-finance
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database tables in Supabase:

```sql
-- Transactions table
create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  description text not null,
  amount decimal(10,2) not null,
  type text check (type in ('income', 'expense')) not null,
  category text not null,
  currency text check (currency in ('CAD', 'USD')) default 'CAD',
  date date not null,
  created_at timestamp with time zone default now()
);

-- Investments table
create table investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  symbol text not null,
  shares decimal(10,4) not null,
  avg_cost decimal(10,2) not null,
  currency text check (currency in ('CAD', 'USD')) default 'USD',
  created_at timestamp with time zone default now()
);

-- Prices cache table
create table prices (
  symbol text primary key,
  price decimal(10,2) not null,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table transactions enable row level security;
alter table investments enable row level security;

-- RLS policies
create policy "Users can manage own transactions" on transactions
  for all using (auth.uid() = user_id);

create policy "Users can manage own investments" on investments
  for all using (auth.uid() = user_id);

create policy "Anyone can read prices" on prices
  for select using (true);
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
├── app/
│   ├── (dashboard)/       # Dashboard routes (protected)
│   │   ├── investments/   # Investment portfolio
│   │   ├── transactions/  # Transaction management
│   │   └── page.tsx       # Main dashboard
│   ├── auth/              # Auth callback
│   └── login/             # Login page
├── components/
│   ├── ui/                # shadcn/ui components
│   └── ...                # Feature components
├── lib/
│   ├── features/          # Redux slices
│   ├── supabase/          # Supabase client setup
│   └── utils.ts           # Utility functions
```

## License

MIT
