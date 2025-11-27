"use client";

import {
  Sidebar,
  SidebarProvider,
  MobileSidebarTrigger,
} from "@/components/sidebar";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { MobileScanFAB } from "@/components/mobile-scan-fab";
import { VoiceAgentFAB } from "@/components/voice-agent";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  user: User;
  needsOnboarding?: boolean;
}

export function DashboardShell({
  children,
  user,
  needsOnboarding = false,
}: DashboardShellProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <Sidebar onSignOut={handleSignOut} />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-sm lg:px-6">
            {/* Mobile menu trigger */}
            <MobileSidebarTrigger />

            <div className="flex flex-1 items-center justify-end gap-4">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 text-sm font-semibold text-emerald-600">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-sm font-medium text-muted-foreground sm:inline-block">
                  {user.email}
                </span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 lg:p-6">{children}</div>
          </main>
        </div>
      </div>

      {/* Onboarding Dialog for new users */}
      <OnboardingDialog open={needsOnboarding} />

      {/* Mobile Scan FAB */}
      <MobileScanFAB />

      {/* Voice Agent FAB */}
      <VoiceAgentFAB />
    </SidebarProvider>
  );
}
