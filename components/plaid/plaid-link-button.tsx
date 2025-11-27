"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  usePlaidLink,
  PlaidLinkOnSuccess,
  PlaidLinkOnExit,
  PlaidLinkOnEvent,
} from "react-plaid-link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Link2, Loader2 } from "lucide-react";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
}

export function PlaidLinkButton({
  onSuccess,
  variant = "default",
  size = "default",
  className,
  children,
}: PlaidLinkButtonProps) {
  const searchParams = useSearchParams();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasOpened = useRef(false);

  // Check for OAuth callback
  const oauthStateId = searchParams.get("oauth_state_id");

  // Fetch link token
  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await response.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
        hasOpened.current = false;
      } else if (data.error) {
        setError(data.error);
        console.error("Link token error:", data.error);
      }
    } catch (err) {
      console.error("Error fetching link token:", err);
      setError("Failed to initialize bank connection");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch link token if returning from OAuth
  useEffect(() => {
    if (oauthStateId && !linkToken) {
      fetchLinkToken();
    }
  }, [oauthStateId]);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      console.log("Plaid Link success!", metadata);
      setExchanging(true);
      try {
        const response = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
          }),
        });

        const data = await response.json();
        console.log("Exchange response:", data);

        if (data.success) {
          // Trigger initial sync
          await fetch("/api/plaid/sync-accounts", { method: "POST" });
          await fetch("/api/plaid/sync-transactions", { method: "POST" });
          onSuccess?.();
        } else {
          setError(data.error || "Failed to connect account");
        }
      } catch (err) {
        console.error("Error exchanging token:", err);
        setError("Failed to complete connection");
      } finally {
        setExchanging(false);
        setLinkToken(null);
        hasOpened.current = false;
        // Clear OAuth params from URL
        if (oauthStateId) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    },
    [onSuccess, oauthStateId]
  );

  const handleExit: PlaidLinkOnExit = useCallback((err, metadata) => {
    console.log("Plaid Link exit:", { err, metadata });
    if (err) {
      setError(
        err.display_message || err.error_message || "Connection was cancelled"
      );
    }
    setLinkToken(null);
    hasOpened.current = false;
  }, []);

  const handleEvent: PlaidLinkOnEvent = useCallback((eventName, metadata) => {
    console.log("Plaid Link event:", eventName, metadata);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
    onEvent: handleEvent,
    receivedRedirectUri: oauthStateId ? window.location.href : undefined,
  });

  // Open Plaid Link when token is ready
  useEffect(() => {
    if (linkToken && ready && !hasOpened.current && !exchanging) {
      hasOpened.current = true;
      open();
    }
  }, [linkToken, ready, open, exchanging]);

  const handleClick = async () => {
    setError(null);
    if (linkToken && ready) {
      hasOpened.current = true;
      open();
    } else {
      await fetchLinkToken();
    }
  };

  const isLoading = loading || exchanging;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {exchanging ? "Connecting..." : "Loading..."}
          </>
        ) : (
          children || (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Connect Bank Account
            </>
          )
        )}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
