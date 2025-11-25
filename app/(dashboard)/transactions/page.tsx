import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transaction-form";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import { deleteTransaction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <TransactionForm />

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions?.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {t.description}
                    {t.is_recurring && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                        Monthly
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t.date} • {t.category}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={`font-bold ${
                      t.type === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}${t.amount} <span className="text-sm ml-1">{t.currency === 'USD' ? '🇺🇸' : '🇨🇦'}</span>
                  </div>
                  <div className="flex items-center">
                    <EditTransactionDialog transaction={t} />
                    <form action={deleteTransaction.bind(null, t.id)}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        ✕
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
            {(!transactions || transactions.length === 0) && (
              <div className="text-center text-muted-foreground py-4">
                No transactions found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
