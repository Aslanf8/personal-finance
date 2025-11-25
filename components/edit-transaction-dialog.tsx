"use client";

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateTransaction } from "@/app/(dashboard)/transactions/actions"
import { useState } from "react"
import { Pencil } from "lucide-react"

const EXPENSE_CATEGORIES = [
  "Housing", "Transport", "Food", "Utilities", "Insurance", 
  "Healthcare", "Saving", "Personal", "Entertainment", "Miscellaneous"
]

const INCOME_CATEGORIES = [
  "Salary", "Bonus", "Investment", "Deposit", "Other"
]

type Transaction = {
  id: string
  amount: number
  description: string
  category: string
  type: string
  date: string
  is_recurring?: boolean
  recurring_frequency?: string | null
  currency?: string
}

export function EditTransactionDialog({ transaction }: { transaction: Transaction }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(transaction.type)
  const [currency, setCurrency] = useState(transaction.currency || 'CAD')
  const [isRecurring, setIsRecurring] = useState(transaction.is_recurring || false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary">
            <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
          <DialogDescription>
            Make changes to your transaction here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form 
          action={async (formData) => {
            await updateTransaction(transaction.id, formData)
            setOpen(false)
          }} 
          className="grid gap-4 py-4"
        >
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="currency" value={currency} />
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Currency</Label>
            <div className="flex gap-2 col-span-3">
                <button
                    type="button"
                    onClick={() => setCurrency('CAD')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    currency === 'CAD' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                    title="Canadian Dollar"
                >
                    🇨🇦
                </button>
                <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    currency === 'USD' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                    title="US Dollar"
                >
                    🇺🇸
                </button>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Type</Label>
            <div className="flex gap-2 col-span-3">
                <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    type === 'expense' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                    Expense
                </button>
                <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    type === 'income' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                >
                    Income
                </button>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={transaction.date} className="col-span-3" required />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Desc</Label>
            <Input id="description" name="description" defaultValue={transaction.description} className="col-span-3" required />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">Category</Label>
            <select 
                id="category"
                name="category" 
                defaultValue={transaction.category}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
                required
            >
                {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">Amount</Label>
            <Input id="amount" name="amount" type="number" step="0.01" defaultValue={transaction.amount} className="col-span-3" required />
          </div>

          {(type === 'income' || type === 'expense') && (
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_recurring" className="text-right">Monthly?</Label>
                <div className="col-span-3 flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        name="is_recurring" 
                        id="is_recurring"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    {isRecurring && <input type="hidden" name="recurring_frequency" value="monthly" />}
                </div>
             </div>
          )}

          <DialogFooter>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
