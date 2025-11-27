"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaidLinkButton } from "./plaid-link-button";
import {
  Building2,
  CreditCard,
  Wallet,
  TrendingUp,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { ConnectedAccount } from "@/lib/plaid/types";

const accountTypeIcons: Record<string, React.ElementType> = {
  depository: Wallet,
  investment: TrendingUp,
  credit: CreditCard,
  loan: Building2,
};

function formatCurrency(amount: number | null, currency: string = "CAD") {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Never";
  return new Date(dateString).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConnectedAccounts() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/plaid/get-accounts");
      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync-accounts", { method: "POST" });
      await fetch("/api/plaid/sync-transactions", { method: "POST" });
      await fetchAccounts();
    } catch (error) {
      console.error("Error syncing:", error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (itemId: string) => {
    if (!confirm("Are you sure you want to disconnect this account?")) return;

    setDisconnecting(itemId);
    try {
      await fetch("/api/plaid/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      await fetchAccounts();
    } catch (error) {
      console.error("Error disconnecting:", error);
    } finally {
      setDisconnecting(null);
    }
  };

  // Group accounts by institution
  const groupedAccounts = accounts.reduce(
    (acc, account) => {
      const key = account.plaid_item_id;
      if (!acc[key]) {
        acc[key] = {
          institution_name: account.institution_name || "Unknown Institution",
          item_status: account.item_status,
          last_synced_at: account.last_synced_at,
          accounts: [],
        };
      }
      acc[key].accounts.push(account);
      return acc;
    },
    {} as Record<
      string,
      {
        institution_name: string;
        item_status: string;
        last_synced_at: string | null;
        accounts: ConnectedAccount[];
      }
    >
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlaidLinkButton onSuccess={fetchAccounts} />
        </div>
        {accounts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync All
          </Button>
        )}
      </div>

      {/* Connected Accounts */}
      {Object.keys(groupedAccounts).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No accounts connected
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Connect your bank accounts to automatically import transactions
              and track your balances.
            </p>
            <PlaidLinkButton onSuccess={fetchAccounts} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAccounts).map(([itemId, group]) => (
            <Card key={itemId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {group.institution_name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {group.item_status === "active" ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                        )}
                        <span>
                          Last synced: {formatDate(group.last_synced_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDisconnect(itemId)}
                    disabled={disconnecting === itemId}
                  >
                    {disconnecting === itemId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {group.accounts.map((account) => {
                    const Icon = accountTypeIcons[account.type] || Wallet;
                    return (
                      <div
                        key={account.id}
                        className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {account.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {account.subtype || account.type}
                              {account.mask && ` •••• ${account.mask}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {formatCurrency(
                              account.current_balance,
                              account.currency
                            )}
                          </p>
                          {account.available_balance !== null &&
                            account.available_balance !==
                              account.current_balance && (
                              <p className="text-xs text-muted-foreground">
                                Available:{" "}
                                {formatCurrency(
                                  account.available_balance,
                                  account.currency
                                )}
                              </p>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
