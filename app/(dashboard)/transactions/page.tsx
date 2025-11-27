import { createClient } from "@/lib/supabase/server";
import { TransactionsContent } from "./transactions-content";
import { deleteTransaction } from "./actions";

interface TransactionsPageProps {
  searchParams: Promise<{ scan?: string }>;
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const autoOpenScan = params.scan === "true";

  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
      </div>

      <TransactionsContent
        transactions={transactions || []}
        autoOpenScan={autoOpenScan}
        onDelete={deleteTransaction}
      />
    </div>
  );
}
