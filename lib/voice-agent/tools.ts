import { tool } from '@openai/agents-realtime';
import { z } from 'zod';

export const getFinancialSummary = tool({
  name: 'get_financial_summary',
  description: 'Get the user\'s complete financial overview including net worth, cash balance, investment value, and unrealized gains/losses. Use this when the user asks about their overall financial situation, net worth, or general financial health.',
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
  description: 'Get detailed information about the user\'s investment portfolio including all holdings, gains/losses, and top performers. Use this when the user asks about their investments, stocks, crypto, or portfolio performance.',
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

export const voiceAgentTools = [
  getFinancialSummary,
  getRecentTransactions,
  getSpendingBreakdown,
  getInvestmentPortfolio,
  getFinancialGoals,
];

