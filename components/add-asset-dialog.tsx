"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAsset } from "@/app/(dashboard)/investments/actions";
import type { AssetCategory } from "@/lib/types";
import {
  ASSET_CATEGORIES,
  PROPERTY_TYPES,
  VEHICLE_TYPES,
  LIABILITY_TYPES,
  CANADIAN_INSTITUTIONS,
} from "@/lib/types";

interface AddAssetDialogProps {
  children: React.ReactNode;
  defaultCategory?: AssetCategory;
  defaultPropertyType?: string;
  defaultSubcategory?: string;
}

export function AddAssetDialog({
  children,
  defaultCategory,
  defaultPropertyType,
  defaultSubcategory,
}: AddAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<AssetCategory>(defaultCategory || "real_estate");

  const isLiability = category === "liability";

  const getLocalDateString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await addAsset(formData);
      if (result?.success) {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLiability ? "Add Liability" : `Add ${ASSET_CATEGORIES[category]?.label || "Asset"}`}
          </DialogTitle>
          <DialogDescription>
            {isLiability
              ? "Track mortgages, loans, and other debts"
              : "Add a new asset to your portfolio"}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="grid gap-4">
          {/* Category Selection */}
          <div className="grid gap-2">
            <Label>Category</Label>
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as AssetCategory)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(ASSET_CATEGORIES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="grid gap-2">
            <Label>
              {category === "real_estate"
                ? "Property Name"
                : category === "vehicle"
                ? "Vehicle Name"
                : isLiability
                ? "Liability Name"
                : "Asset Name"}
            </Label>
            <Input
              name="name"
              placeholder={
                category === "real_estate"
                  ? "e.g., Primary Residence"
                  : category === "vehicle"
                  ? "e.g., 2022 Honda Civic"
                  : isLiability
                  ? "e.g., Primary Mortgage"
                  : "e.g., Art Collection"
              }
              required
            />
          </div>

          {/* Current Value */}
          <div className="grid gap-2">
            <Label>{isLiability ? "Amount Owed" : "Current Value"} (CAD)</Label>
            <Input name="current_value" type="number" step="0.01" placeholder="0.00" required />
          </div>

          {/* Category-specific fields */}
          {category === "real_estate" && (
            <>
              <div className="grid gap-2">
                <Label>Property Type</Label>
                <select
                  name="property_type"
                  defaultValue={defaultPropertyType || "house"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(PROPERTY_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Address</Label>
                <Input name="address" placeholder="123 Main St, Toronto, ON" />
              </div>
            </>
          )}

          {category === "vehicle" && (
            <>
              <div className="grid gap-2">
                <Label>Vehicle Type</Label>
                <select
                  name="subcategory"
                  defaultValue={defaultSubcategory || "car"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(VEHICLE_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label>Year</Label>
                  <Input name="year" type="number" placeholder="2024" />
                </div>
                <div className="grid gap-2">
                  <Label>Make</Label>
                  <Input name="make" placeholder="Honda" />
                </div>
                <div className="grid gap-2">
                  <Label>Model</Label>
                  <Input name="model" placeholder="Civic" />
                </div>
              </div>
            </>
          )}

          {isLiability && (
            <>
              <div className="grid gap-2">
                <Label>Liability Type</Label>
                <select
                  name="subcategory"
                  defaultValue={defaultSubcategory || "mortgage"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(LIABILITY_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Interest Rate (%)</Label>
                  <Input name="interest_rate" type="number" step="0.01" placeholder="5.25" />
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Payment</Label>
                  <Input name="monthly_payment" type="number" step="0.01" placeholder="2,500.00" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Payment Day of Month</Label>
                <Input name="payment_day" type="number" min="1" max="31" placeholder="1" />
                <p className="text-xs text-muted-foreground">Day of month when payment is due (1-31)</p>
              </div>

              {/* Auto-create recurring transaction */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="create_recurring_transaction"
                    id="create_recurring_transaction"
                    defaultChecked
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <Label htmlFor="create_recurring_transaction" className="text-sm font-medium text-emerald-800">
                      Auto-create recurring expense
                    </Label>
                    <p className="text-xs text-emerald-600 mt-1">
                      Creates a monthly recurring transaction for this payment. 
                      This will appear in your cash flow and expense tracking.
                    </p>
                  </div>
                </div>
              </div>

              <input type="hidden" name="is_liability" value="true" />
            </>
          )}

          {/* Institution (for all types) */}
          <div className="grid gap-2">
            <Label>Institution (Optional)</Label>
            <select
              name="institution"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select institution...</option>
              {CANADIAN_INSTITUTIONS.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {/* Purchase fields (not for liabilities) */}
          {!isLiability && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Purchase Price (Optional)</Label>
                  <Input name="purchase_price" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="grid gap-2">
                  <Label>Purchase Date</Label>
                  <Input name="purchase_date" type="date" defaultValue={getLocalDateString()} />
                </div>
              </div>
            </>
          )}

          {/* Currency */}
          <div className="grid gap-2">
            <Label>Currency</Label>
            <select
              name="currency"
              defaultValue="CAD"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="CAD">🇨🇦 CAD</option>
              <option value="USD">🇺🇸 USD</option>
            </select>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description (Optional)</Label>
            <Input name="description" placeholder="Any additional details..." />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Notes (Optional)</Label>
            <textarea
              name="notes"
              placeholder="Private notes..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : isLiability ? "Add Liability" : "Add Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

