"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInvestment } from "@/app/(dashboard)/investments/actions";
import { useState } from "react";
import { Pencil } from "lucide-react";

type Investment = {
  id: string;
  symbol: string;
  quantity: number;
  avg_cost: number;
  asset_type: string;
  account_label?: string;
  date?: string;
};

const ACCOUNT_LABELS = ['Margin', 'TFSA', 'RRSP', 'FHSA', 'Cash', 'Crypto'] as const;

export function EditInvestmentDialog({
  investment,
}: {
  investment: Investment;
}) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Investment</DialogTitle>
          <DialogDescription>
            Update your investment details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            setIsSaving(true);
            await updateInvestment(investment.id, formData);
            setIsSaving(false);
            setOpen(false);
          }}
          className="grid gap-4 py-4"
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={
                investment.date || new Date().toISOString().split("T")[0]
              }
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="symbol" className="text-right">
              Symbol
            </Label>
            <Input
              id="symbol"
              name="symbol"
              placeholder="AAPL"
              defaultValue={investment.symbol}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity
            </Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              defaultValue={investment.quantity}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="avg_cost" className="text-right">
              Avg Cost
            </Label>
            <Input
              id="avg_cost"
              name="avg_cost"
              type="number"
              step="any"
              defaultValue={investment.avg_cost}
              className="col-span-3"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="asset_type" className="text-right">
              Type
            </Label>
            <select
              id="asset_type"
              name="asset_type"
              defaultValue={investment.asset_type}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
            >
              <option value="stock">Stock</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="account_label" className="text-right">
              Account
            </Label>
            <select
              id="account_label"
              name="account_label"
              defaultValue={investment.account_label || 'Margin'}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 col-span-3"
            >
              {ACCOUNT_LABELS.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

