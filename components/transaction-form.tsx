"use client";
import { addTransaction } from "@/app/(dashboard)/transactions/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";

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
  "Miscellaneous",
];

const INCOME_CATEGORIES = ["Salary", "Bonus", "Investment", "Deposit", "Other"];

export function TransactionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
  const [isRecurring, setIsRecurring] = useState(false);

  return (
    <div className="border p-4 rounded-lg bg-card text-card-foreground space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Add Transaction</h3>
        <div className="flex gap-2">
          <div className="flex gap-2 bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setCurrency("CAD")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currency === "CAD"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Canadian Dollar"
            >
              🇨🇦
            </button>
            <button
              type="button"
              onClick={() => setCurrency("USD")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currency === "USD"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="US Dollar"
            >
              🇺🇸
            </button>
          </div>

          <div className="flex gap-2 bg-muted p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
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
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                type === "income"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Income
            </button>
          </div>
        </div>
      </div>

      <form
        ref={formRef}
        action={async (formData) => {
          await addTransaction(formData);
          formRef.current?.reset();
          setIsRecurring(false);
        }}
        className="grid gap-4 md:grid-cols-6 items-end"
      >
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="currency" value={currency} />

        <div className="grid gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            type="date"
            name="date"
            required
            defaultValue={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input
            name="description"
            placeholder={type === "expense" ? "Groceries" : "Paycheck"}
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <select
            name="category"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select category
            </option>
            {(type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(
              (cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              )
            )}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            type="number"
            step="0.01"
            name="amount"
            placeholder="0.00"
            required
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center gap-2 h-10">
            <input
              type="checkbox"
              name="is_recurring"
              id="is_recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_recurring" className="mb-0 cursor-pointer">
              Monthly?
            </Label>
          </div>
          {isRecurring && (
            <input type="hidden" name="recurring_frequency" value="monthly" />
          )}
        </div>

        <div className="md:col-span-5 flex justify-end mt-2">
          <Button
            type="submit"
            className={
              type === "income" ? "bg-green-600 hover:bg-green-700" : ""
            }
          >
            {type === "income" ? "Add Income" : "Add Expense"}
          </Button>
        </div>
      </form>
    </div>
  );
}
