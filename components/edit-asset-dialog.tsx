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
import { updateAsset } from "@/app/(dashboard)/investments/actions";
import type { Asset, AssetCategory } from "@/lib/types";
import {
  ASSET_CATEGORIES,
  PROPERTY_TYPES,
  VEHICLE_TYPES,
  LIABILITY_TYPES,
  CANADIAN_INSTITUTIONS,
} from "@/lib/types";
import { Pencil } from "lucide-react";

interface EditAssetDialogProps {
  asset: Asset;
  allAssets: Asset[];
}

export function EditAssetDialog({ asset, allAssets }: EditAssetDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [category, setCategory] = useState<AssetCategory>(asset.category);

  const isLiability = category === "liability" || asset.is_liability;

  // Get linkable assets (real estate for mortgages, vehicles for car loans)
  const linkableAssets = allAssets.filter((a) => {
    if (asset.subcategory === "mortgage" || asset.subcategory === "heloc") {
      return a.category === "real_estate";
    }
    if (asset.subcategory === "car_loan") {
      return a.category === "vehicle";
    }
    return false;
  });

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateAsset(asset.id, formData);
      if (result?.success) {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {asset.name}</DialogTitle>
          <DialogDescription>Update the details of this {isLiability ? "liability" : "asset"}</DialogDescription>
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
            <Label>Name</Label>
            <Input name="name" defaultValue={asset.name} required />
          </div>

          {/* Current Value */}
          <div className="grid gap-2">
            <Label>{isLiability ? "Amount Owed" : "Current Value"} (CAD)</Label>
            <Input
              name="current_value"
              type="number"
              step="0.01"
              defaultValue={asset.current_value}
              required
            />
          </div>

          {/* Category-specific fields */}
          {category === "real_estate" && (
            <>
              <div className="grid gap-2">
                <Label>Property Type</Label>
                <select
                  name="property_type"
                  defaultValue={asset.property_type || "house"}
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
                <Input name="address" defaultValue={asset.address || ""} placeholder="123 Main St, Toronto, ON" />
              </div>
            </>
          )}

          {category === "vehicle" && (
            <>
              <div className="grid gap-2">
                <Label>Vehicle Type</Label>
                <select
                  name="subcategory"
                  defaultValue={asset.subcategory || "car"}
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
                  <Input name="year" type="number" defaultValue={asset.year || ""} />
                </div>
                <div className="grid gap-2">
                  <Label>Make</Label>
                  <Input name="make" defaultValue={asset.make || ""} />
                </div>
                <div className="grid gap-2">
                  <Label>Model</Label>
                  <Input name="model" defaultValue={asset.model || ""} />
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
                  defaultValue={asset.subcategory || "mortgage"}
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
                  <Input
                    name="interest_rate"
                    type="number"
                    step="0.01"
                    defaultValue={asset.interest_rate || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Monthly Payment</Label>
                  <Input
                    name="monthly_payment"
                    type="number"
                    step="0.01"
                    defaultValue={asset.monthly_payment || ""}
                    placeholder="2,500.00"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Payment Day of Month</Label>
                <Input
                  name="payment_day"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={asset.payment_day || ""}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">Day of month when payment is due (1-31)</p>
              </div>
              {asset.linked_transaction_id && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">
                    ✓ Linked to recurring transaction. Changes to monthly payment will be reflected in cash flow.
                  </p>
                </div>
              )}
              {linkableAssets.length > 0 && (
                <div className="grid gap-2">
                  <Label>Linked Asset (Optional)</Label>
                  <select
                    name="linked_asset_id"
                    defaultValue={asset.linked_asset_id || ""}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No linked asset</option>
                    {linkableAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Link this liability to an asset (e.g., mortgage to property)
                  </p>
                </div>
              )}
              <input type="hidden" name="is_liability" value="true" />
            </>
          )}

          {/* Institution */}
          <div className="grid gap-2">
            <Label>Institution</Label>
            <select
              name="institution"
              defaultValue={asset.institution || ""}
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

          {/* Purchase fields */}
          {!isLiability && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Purchase Price</Label>
                <Input
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  defaultValue={asset.purchase_price || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label>Purchase Date</Label>
                <Input name="purchase_date" type="date" defaultValue={asset.purchase_date || ""} />
              </div>
            </div>
          )}

          {/* Currency */}
          <div className="grid gap-2">
            <Label>Currency</Label>
            <select
              name="currency"
              defaultValue={asset.currency}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="CAD">🇨🇦 CAD</option>
              <option value="USD">🇺🇸 USD</option>
            </select>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label>Description</Label>
            <Input name="description" defaultValue={asset.description || ""} />
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label>Notes</Label>
            <textarea
              name="notes"
              defaultValue={asset.notes || ""}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

