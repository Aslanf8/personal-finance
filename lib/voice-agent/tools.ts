import { tool } from '@openai/agents-realtime';
import { z } from 'zod';

export const getFinancialSummary = tool({
  name: 'get_financial_summary',
  description: 'Get the user\'s complete financial overview including net worth, cash balance, investment value, physical assets, liabilities, and unrealized gains/losses. Use this when the user asks about their overall financial situation, net worth, or general financial health.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/financial-summary');
    if (!res.ok) throw new Error('Failed to fetch financial summary');
    return res.json();
  },
});

export const getRecentTransactions = tool({
  name: 'get_recent_transactions',
  description: 'Get the user\'s recent transactions. Can filter by type (income/expense) and category. Use this when the user asks about recent purchases, spending, income, or specific transactions.',
  parameters: z.object({
    limit: z.number().optional().describe('Number of transactions to return (default 10)'),
    type: z.enum(['income', 'expense']).optional().describe('Filter by transaction type'),
    category: z.string().optional().describe('Filter by category name (e.g., "Food", "Transport", "Salary")'),
  }),
  execute: async (params) => {
    const searchParams = new URLSearchParams();
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.type) searchParams.set('type', params.type);
    if (params.category) searchParams.set('category', params.category);
    
    const res = await fetch(`/api/voice-agent/transactions?${searchParams}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },
});

export const getSpendingBreakdown = tool({
  name: 'get_spending_breakdown',
  description: 'Get a breakdown of spending by category for a specific time period. Shows total spending, savings rate, and top spending categories. Use this when the user asks about where their money is going, spending habits, or budget analysis.',
  parameters: z.object({
    period: z.enum(['this-month', 'last-month', 'this-year', 'last-year', 'all-time'])
      .optional()
      .describe('Time period for the breakdown (default: this-month)'),
  }),
  execute: async (params) => {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set('period', params.period);
    
    const res = await fetch(`/api/voice-agent/spending?${searchParams}`);
    if (!res.ok) throw new Error('Failed to fetch spending breakdown');
    return res.json();
  },
});

export const getInvestmentPortfolio = tool({
  name: 'get_investment_portfolio',
  description: 'Get detailed information about the user\'s securities portfolio (stocks, ETFs, crypto) including all holdings, gains/losses, and top performers. Use this when the user asks about their investments, stocks, crypto, or portfolio performance.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/investments');
    if (!res.ok) throw new Error('Failed to fetch investments');
    return res.json();
  },
});

export const getFinancialGoals = tool({
  name: 'get_financial_goals',
  description: 'Get the user\'s financial goals and progress towards them. Includes primary goal, milestones, and days remaining. Use this when the user asks about their goals, targets, savings progress, or financial plans.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/goals');
    if (!res.ok) throw new Error('Failed to fetch goals');
    return res.json();
  },
});

export const getRecurringTransactions = tool({
  name: 'get_recurring_transactions',
  description: 'Get all recurring transactions like subscriptions, rent, salary, and regular bills. Useful for understanding fixed costs and regular income. Use when user asks about subscriptions, bills, or recurring expenses.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/recurring');
    if (!res.ok) throw new Error('Failed to fetch recurring transactions');
    return res.json();
  },
});

export const getIncomeBreakdown = tool({
  name: 'get_income_breakdown',
  description: 'Get a breakdown of income sources by category (Salary, Bonus, Investment, etc.). Use when user asks about their income, earnings, or where money comes from.',
  parameters: z.object({
    period: z.enum(['this-month', 'last-month', 'this-year', 'all-time'])
      .optional()
      .describe('Time period (default: this-month)'),
  }),
  execute: async (params) => {
    const searchParams = new URLSearchParams();
    if (params.period) searchParams.set('period', params.period);
    
    const res = await fetch(`/api/voice-agent/income?${searchParams}`);
    if (!res.ok) throw new Error('Failed to fetch income breakdown');
    return res.json();
  },
});

export const getInvestmentAccounts = tool({
  name: 'get_investment_accounts',
  description: 'Get investments grouped by account type (TFSA, RRSP, FHSA, RESP, RDSP, LIRA, Pension, Margin). Shows value and holdings in each account. Use when user asks about their registered accounts or wants to see investments by account.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/accounts');
    if (!res.ok) throw new Error('Failed to fetch investment accounts');
    return res.json();
  },
});

export const getMonthlyComparison = tool({
  name: 'get_monthly_comparison',
  description: 'Compare financial metrics between this month and last month. Shows changes in spending, income, and savings. Use when user asks about trends, changes, or how they\'re doing compared to before.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/compare');
    if (!res.ok) throw new Error('Failed to fetch monthly comparison');
    return res.json();
  },
});

export const getUserProfile = tool({
  name: 'get_user_profile',
  description: 'Get the user\'s profile information including their name and preferences. Use this to personalize the conversation by using their name.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/profile');
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },
});

export const getPhysicalAssets = tool({
  name: 'get_physical_assets',
  description: 'Get all physical assets including real estate (houses, condos, land), vehicles (cars, trucks, boats), retirement accounts, collectibles, and business equity. Shows current values, purchase prices, and appreciation. Use when user asks about their property, house, car, real estate value, or physical assets.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/assets');
    if (!res.ok) throw new Error('Failed to fetch assets');
    return res.json();
  },
});

export const getLiabilities = tool({
  name: 'get_liabilities',
  description: 'Get all liabilities including mortgages, HELOC, car loans, student loans, credit cards, and lines of credit. Shows amount owed, interest rates, monthly payments, and estimated payoff time. Use when user asks about their debt, mortgage, loans, what they owe, or monthly debt payments.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/liabilities');
    if (!res.ok) throw new Error('Failed to fetch liabilities');
    return res.json();
  },
});

export const getNetWorthBreakdown = tool({
  name: 'get_net_worth_breakdown',
  description: 'Get a complete net worth breakdown showing all asset categories (cash, securities, real estate, vehicles, retirement, collectibles, business) and liabilities. Shows asset allocation percentages and detailed breakdown. Use when user wants to understand their full net worth composition or asset allocation.',
  parameters: z.object({}),
  execute: async () => {
    const res = await fetch('/api/voice-agent/net-worth');
    if (!res.ok) throw new Error('Failed to fetch net worth breakdown');
    return res.json();
  },
});

export const voiceAgentTools = [
  getFinancialSummary,
  getRecentTransactions,
  getSpendingBreakdown,
  getInvestmentPortfolio,
  getFinancialGoals,
  getRecurringTransactions,
  getIncomeBreakdown,
  getInvestmentAccounts,
  getMonthlyComparison,
  getUserProfile,
  getPhysicalAssets,
  getLiabilities,
  getNetWorthBreakdown,
];
