"use client";
import { addTransaction } from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanTransactionDialog } from "@/components/scan-transaction-dialog";
import { useRef, useState } from "react";
import { ScannedTransaction } from "@/lib/types";
import { Scan } from "lucide-react";

export const EXPENSE_CATEGORIES = [
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

export const INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Investment",
  "Deposit",
  "Other",
];

export function TransactionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [isRecurring, setIsRecurring] = useState(false);

  // Controlled form fields for scan integration
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setCategory("");
    setAmount("");
    setIsRecurring(false);
    setType("expense");
    setCurrency("CAD");
  };

  const handleScanComplete = (transactions: ScannedTransaction[]) => {
    if (transactions.length > 0) {
      const t = transactions[0];
      setType(t.type);
      setCurrency(t.currency);
      setDate(t.date);
      setDescription(t.description);
      setCategory(t.category);
      setAmount(t.amount.toString());
      setIsRecurring(false);
    }
  };

  return (
    <div className="border rounded-lg bg-card text-card-foreground">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">Add Transaction</h3>
          <ScanTransactionDialog onScanComplete={handleScanComplete}>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Scan className="h-3 w-3" />
              Scan
            </Button>
          </ScanTransactionDialog>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/60 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                type === "expense"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                type === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income
            </button>
          </div>

          <div className="flex bg-muted/60 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => setCurrency("CAD")}
              className={`px-2.5 py-1.5 text-xs rounded transition-colors ${
                currency === "CAD"
                  ? "bg-background shadow-sm"
                  : "opacity-50 hover:opacity-100"
              }`}
              title="Canadian Dollar"
            >
              🇨🇦
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-2.5 py-1.5 text-xs rounded transition-colors ${
                currency === "USD"
                  ? "bg-background shadow-sm"
                  : "opacity-50 hover:opacity-100"
              }`}
              title="US Dollar"
            >
              🇺🇸
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        ref={formRef}
        action={async (formData) => {
          await addTransaction(formData);
          resetForm();
        }}
        className="p-4 space-y-4"
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="currency" value={currency} />

        {/* Row 1: Description (main field) */}
        <div className="grid gap-1.5">
          <Label
            htmlFor="description"
            className="text-xs text-muted-foreground"
          >
            Description
          </Label>
          <Input
            name="description"
            placeholder={
              type === "expense"
                ? "Groceries, coffee, etc."
                : "Salary, bonus, etc."
            }
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-10"
          />
        </div>

        {/* Row 2: Amount + Category */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="amount" className="text-xs text-muted-foreground">
              Amount
            </Label>
            <Input
              type="number"
              step="0.01"
              name="amount"
              placeholder="0.00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="category" className="text-xs text-muted-foreground">
              Category
            </Label>
            <select
              name="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              {(type === "expense"
                ? EXPENSE_CATEGORIES
                : INCOME_CATEGORIES
              ).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Date + Recurring + Submit */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="grid gap-1.5 sm:w-40">
            <Label htmlFor="date" className="text-xs text-muted-foreground">
              Date
            </Label>
            <Input
              type="date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-10"
            />
          </div>

          <label className="flex items-center gap-2 h-10 cursor-pointer select-none">
            <input
              type="checkbox"
              name="is_recurring"
              id="is_recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm text-muted-foreground">Monthly</span>
          </label>
          {isRecurring && (
            <input type="hidden" name="recurring_frequency" value="monthly" />
          )}

          <div className="sm:ml-auto">
            <Button
              type="submit"
              className={`w-full sm:w-auto ${
                type === "income"
                  ? "bg-emerald-600/90 hover:bg-emerald-600 text-white"
                  : ""
              }`}
            >
              {type === "income" ? "Add Income" : "Add Expense"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
