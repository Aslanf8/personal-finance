"use client";

import { usePathname, useRouter } from "next/navigation";
import { Scan } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileScanFAB() {
  const router = useRouter();
  const pathname = usePathname();

  // Don't show on transactions page (already has scan button visible)
  if (pathname === "/transactions") return null;

  const handleClick = () => {
    router.push("/transactions?scan=true");
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Only visible on mobile
        "lg:hidden",
        // Positioning - bottom right, fixed
        "fixed bottom-6 right-6 z-50",
        // Size and shape
        "h-14 w-14 rounded-full",
        // Gradient background
        "bg-gradient-to-br from-emerald-500 to-teal-600",
        // Shadow and depth
        "shadow-lg shadow-emerald-500/25",
        // Hover effects
        "hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105",
        // Active state
        "active:scale-95",
        // Transition
        "transition-all duration-200 ease-out",
        // Flex for icon centering
        "flex items-center justify-center",
        // Touch optimization
        "touch-manipulation",
        // Ring on focus
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
      )}
      aria-label="Scan receipt"
    >
      <Scan className="h-6 w-6 text-white" strokeWidth={2.5} />
      
      {/* Subtle pulse animation ring */}
      <span className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" style={{ animationDuration: '2s' }} />
    </button>
  );
}

