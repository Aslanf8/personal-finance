# Personal Finance Hub

A private, customizable personal finance tracker built for people who want full control over their financial data. Track your income, expenses, investments, and net worth all in one place — your way.

## Why This Exists

I built this because most personal finance tools out there (Yahoo Finance, Mint, etc.) weren't exactly what I wanted. They either lacked features I needed, had too many features I didn't want, or didn't let me customize things the way I preferred.

So I decided to create an open-source project that anyone — including myself — can use to build their own private, custom personal finance hub. You own your data, you control what you track, and you can customize it however you want.

## Features

- **Custom Financial Goals** — Set your own net worth goals, savings targets, or investment milestones. Track progress with visual timelines and milestones.
- **User Profiles** — Personalize your experience with your name, birthday, and preferred currency.
- **Transaction Tracking** — Log income and expenses with categories. Supports both CAD and USD.
- **Investment Portfolio** — Track stocks and ETFs with real-time prices from Yahoo Finance.
- **Dashboard Overview** — See your net worth, cash balance, investment value, and savings at a glance.
- **Period Analysis** — Filter and analyze your finances by month, quarter, year, or all-time.
- **Beautiful Charts** — Visualize your cash flow and asset allocation with interactive charts.
- **Private & Secure** — Your data stays in your Supabase database. No third-party tracking.

## Tech Stack

- **Next.js 16** — Modern React framework
- **Supabase** — Database and authentication
- **TypeScript** — Type-safe code
- **Tailwind CSS** — Styling
- **shadcn/ui** — Beautiful UI components

## Getting Started

### What You Need

- Node.js 22 or higher
- A Supabase account (free tier works great)

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
```

You can find these in your Supabase project settings.

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
```

5. **Run the app:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **First time setup:**

When you first log in, you'll go through a quick onboarding process where you can:

- Set your name and birthday
- Choose your preferred currency
- Create your first financial goal

After that, you're ready to start tracking your finances!

## How to Use

1. **Set up your profile** — Go to Settings to add your name, birthday, and preferred currency.
2. **Create a financial goal** — Set a net worth target, savings goal, or custom mission. Add milestones to track progress.
3. **Add transactions** — Log your income and expenses. Mark recurring items to save time.
4. **Track investments** — Add your stocks and ETFs. Prices update automatically from Yahoo Finance.
5. **Monitor your dashboard** — Watch your net worth grow and see how you're progressing toward your goals.

## Customization

This is your personal finance hub. You can:

- Set multiple financial goals with custom amounts and dates
- Add milestones to break down big goals into smaller steps
- Choose color themes for your goals
- Track investments across different account types (TFSA, RRSP, Margin, etc.)
- Filter transactions by time period
- View everything in CAD or USD

## Project Structure

```
├── app/
│   ├── (dashboard)/          # Main dashboard pages
│   │   ├── settings/         # Profile and goals management
│   │   ├── transactions/     # Transaction tracking
│   │   ├── investments/      # Investment portfolio
│   │   └── page.tsx          # Dashboard home
│   ├── auth/                 # Authentication
│   └── login/                # Login page
├── components/
│   ├── ui/                   # Reusable UI components
│   └── ...                   # Feature components
├── lib/
│   ├── types/                # TypeScript types
│   ├── features/             # Redux state management
│   └── supabase/             # Database client
```

## Contributing

This is an open-source project. Feel free to:

- Report bugs
- Suggest features
- Submit pull requests
- Fork and customize for your own needs

## License

MIT — Use it however you want, including for commercial purposes.

---

**Built with ❤️ for people who want control over their financial data.**
