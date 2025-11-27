"use client";

import { TransactionForm } from "@/components/transaction-form";
import { TransactionHistory } from "@/components/transaction-history";

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  currency?: string;
  description: string;
  category: string;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
}

interface TransactionsContentProps {
  transactions: Transaction[];
  autoOpenScan: boolean;
  onDelete: (id: string) => Promise<void>;
}

export function TransactionsContent({
  transactions,
  autoOpenScan,
  onDelete,
}: TransactionsContentProps) {
  return (
    <>
      <TransactionForm autoOpenScan={autoOpenScan} />
      <TransactionHistory
        transactions={transactions}
        onDelete={onDelete}
        initialCount={15}
        loadMoreCount={15}
      />
    </>
  );
}

