"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Receipt } from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  currency?: string;
  description?: string;
  category?: string;
  is_recurring?: boolean;
  _isProjected?: boolean;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
  initialCount?: number;
  loadMoreCount?: number;
}

export function RecentTransactions({
  transactions,
  initialCount = 8,
  loadMoreCount = 10,
}: RecentTransactionsProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);

  const visibleTransactions = transactions.slice(0, visibleCount);
  const hasMore = visibleCount < transactions.length;
  const remainingCount = transactions.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + loadMoreCount, transactions.length));
  };

  return (
    <Card className="col-span-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            Recent Transactions
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {visibleCount} of {transactions.length}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {visibleTransactions.map((t, index) => (
            <div
              key={t.id}
              className={`flex items-center py-3 px-2 -mx-2 rounded-lg transition-colors hover:bg-muted/50 ${
                index !== visibleTransactions.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              {/* Transaction Icon */}
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full mr-3 flex-shrink-0 ${
                  t.type === "income"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                <span className="text-sm font-semibold">
                  {t.type === "income" ? "+" : "−"}
                </span>
              </div>

              {/* Transaction Details */}
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none truncate">
                    {t.description || "Untitled"}
                  </p>
                  {t.is_recurring && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                      Monthly
                    </span>
                  )}
                  {t._isProjected && (
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                      Projected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  • {t.category || "Uncategorized"}
                </p>
              </div>

              {/* Amount */}
              <div
                className={`ml-3 text-right flex-shrink-0 ${
                  t.type === "income" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <span className="font-semibold">
                  {t.type === "income" ? "+" : "-"}$
                  {Number(t.amount).toLocaleString("en-CA", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ml-1 text-sm">
                  {t.currency === "USD" ? "🇺🇸" : "🇨🇦"}
                </span>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No transactions yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add your first transaction to get started
              </p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleLoadMore}
              className="w-full h-10 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all group"
            >
              <ChevronDown className="h-4 w-4 mr-2 transition-transform group-hover:translate-y-0.5" />
              Load {Math.min(loadMoreCount, remainingCount)} more
              <span className="ml-1.5 text-xs opacity-60">
                ({remainingCount} remaining)
              </span>
            </Button>
          </div>
        )}

        {/* All Loaded State */}
        {!hasMore && transactions.length > initialCount && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-center text-xs text-muted-foreground">
              ✓ All {transactions.length} transactions loaded
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

