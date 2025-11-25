"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import {
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  Tag,
  ArrowUpDown,
} from "lucide-react";

const EXPENSE_CATEGORIES = [
  "Housing",
  "Transport",
  "Food",
  "Utilities",
  "Insurance",
  "Healthcare",
  "Saving",
  "Personal",
  "Entertainment",
  "Credit",
  "Miscellaneous",
];

const INCOME_CATEGORIES = ["Salary", "Bonus", "Investment", "Deposit", "Other"];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

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

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDelete: (id: string) => Promise<void>;
  initialCount?: number;
  loadMoreCount?: number;
}

type SortField = "date" | "amount";
type SortOrder = "asc" | "desc";

export function TransactionHistory({
  transactions,
  onDelete,
  initialCount = 15,
  loadMoreCount = 15,
}: TransactionHistoryProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.description?.toLowerCase().includes(query) ||
          t.category?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter((t) => t.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((t) => t.date <= dateTo);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [transactions, searchQuery, typeFilter, categoryFilter, dateFrom, dateTo, sortField, sortOrder]);

  const visibleTransactions = filteredTransactions.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTransactions.length;
  const remainingCount = filteredTransactions.length - visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + loadMoreCount, filteredTransactions.length));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setVisibleCount(initialCount);
  };

  const hasActiveFilters =
    searchQuery || typeFilter !== "all" || categoryFilter !== "all" || dateFrom || dateTo;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Get unique categories from transactions
  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [transactions]);

  // Calculate totals for filtered results
  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {filteredTransactions.length} {filteredTransactions.length === 1 ? "result" : "results"}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(initialCount);
              }}
              className="pl-9 h-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9 px-3"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 h-5 w-5 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center">
                {[typeFilter !== "all", categoryFilter !== "all", dateFrom, dateTo].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border/50 space-y-4">
            {/* Type Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-20">
                <Tag className="h-3.5 w-3.5 inline mr-1" />
                Type
              </span>
              <div className="flex gap-1">
                {(["all", "income", "expense"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTypeFilter(type);
                      setVisibleCount(initialCount);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      typeFilter === type
                        ? type === "income"
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : type === "expense"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground border border-border hover:bg-muted"
                    }`}
                  >
                    {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-20">
                <Tag className="h-3.5 w-3.5 inline mr-1" />
                Category
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setVisibleCount(initialCount);
                }}
                className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-20">
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                Date
              </span>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setVisibleCount(initialCount);
                  }}
                  className="h-8 w-36 text-xs"
                  placeholder="From"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setVisibleCount(initialCount);
                  }}
                  className="h-8 w-36 text-xs"
                  placeholder="To"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-20">
                <ArrowUpDown className="h-3.5 w-3.5 inline mr-1" />
                Sort
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => toggleSort("date")}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                    sortField === "date"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  Date
                  {sortField === "date" && (
                    <span className="text-[10px]">{sortOrder === "desc" ? "↓" : "↑"}</span>
                  )}
                </button>
                <button
                  onClick={() => toggleSort("amount")}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                    sortField === "amount"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  Amount
                  {sortField === "amount" && (
                    <span className="text-[10px]">{sortOrder === "desc" ? "↓" : "↑"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {filteredTransactions.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="text-xs text-emerald-600 font-medium">Income</div>
              <div className="text-lg font-bold text-emerald-700">
                +${totals.income.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <div className="text-xs text-red-600 font-medium">Expenses</div>
              <div className="text-lg font-bold text-red-700">
                -${totals.expense.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${totals.net >= 0 ? "bg-blue-50 border border-blue-100" : "bg-orange-50 border border-orange-100"}`}>
              <div className={`text-xs font-medium ${totals.net >= 0 ? "text-blue-600" : "text-orange-600"}`}>Net</div>
              <div className={`text-lg font-bold ${totals.net >= 0 ? "text-blue-700" : "text-orange-700"}`}>
                {totals.net >= 0 ? "+" : "-"}${Math.abs(totals.net).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-1">
          {visibleTransactions.map((t, index) => (
            <div
              key={t.id}
              className={`flex items-center py-3 px-3 -mx-3 rounded-lg transition-colors hover:bg-muted/50 group ${
                index !== visibleTransactions.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              {/* Transaction Icon */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full mr-3 flex-shrink-0 ${
                  t.type === "income"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                <span className="text-sm font-bold">
                  {t.type === "income" ? "+" : "−"}
                </span>
              </div>

              {/* Transaction Details */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none truncate">
                    {t.description || "Untitled"}
                  </p>
                  {t.is_recurring && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                      Monthly
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  • <span className="font-medium">{t.category || "Uncategorized"}</span>
                </p>
              </div>

              {/* Amount */}
              <div
                className={`mx-4 text-right flex-shrink-0 ${
                  t.type === "income" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                <span className="font-bold">
                  {t.type === "income" ? "+" : "-"}$
                  {Number(t.amount).toLocaleString("en-CA", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="ml-1.5 text-sm">
                  {t.currency === "USD" ? "🇺🇸" : "🇨🇦"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <EditTransactionDialog transaction={t} />
                <form action={onDelete.bind(null, t.id)}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  >
                    ✕
                  </Button>
                </form>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {filteredTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              {hasActiveFilters ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    No matching transactions
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try adjusting your search or filters
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-4"
                  >
                    Clear all filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    No transactions yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add your first transaction above to get started
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && (
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="w-full h-10 text-sm font-medium transition-all group"
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
        {!hasMore && filteredTransactions.length > initialCount && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-center text-xs text-muted-foreground">
              ✓ All {filteredTransactions.length} transactions loaded
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

