"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  ChevronLeft,
  Menu,
  Wallet,
  LogOut,
  Settings,
  X,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
  },
  {
    title: "Investments",
    href: "/investments",
    icon: TrendingUp,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarContextValue {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: React.ReactNode;
}

function getStoredCollapsedState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sidebar-collapsed") === "true";
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(getStoredCollapsedState);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

function NavLink({
  item,
  isCollapsed,
  isActive,
  onClick,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        "hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5",
        isActive
          ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110",
          isActive && "text-primary"
        )}
      />
      {!isCollapsed && <span className="truncate">{item.title}</span>}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

interface SidebarProps {
  onSignOut: () => void;
  userEmail?: string;
}

function SidebarContent({
  mobile = false,
  onSignOut,
  onNavClick,
  onClose,
  userEmail,
}: {
  mobile?: boolean;
  onSignOut: () => void;
  onNavClick?: () => void;
  onClose?: () => void;
  userEmail?: string;
}) {
  const { isCollapsed } = useSidebarContext();
  const pathname = usePathname();
  const effectiveCollapsed = isCollapsed && !mobile;

  return (
    <div className="flex h-full flex-col">
      {/* Header Section */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border/50 px-4",
          effectiveCollapsed ? "justify-center px-2" : "justify-between"
        )}
      >
        <div className={cn("flex items-center", !effectiveCollapsed && "gap-3")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          {!effectiveCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-base font-bold tracking-tight">
                FinanceHub
              </span>
              <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Personal Finance
              </span>
            </div>
          )}
        </div>
        {/* Close button for mobile */}
        {mobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        )}
      </div>

      {/* User Section - Mobile Only */}
      {mobile && userEmail && (
        <div className="border-b border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-600/20 text-sm font-semibold text-emerald-600">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium">Account</span>
              <span className="truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <div
          className={cn(
            "mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70",
            effectiveCollapsed && "text-center"
          )}
        >
          {effectiveCollapsed ? "•••" : "Navigation"}
        </div>
        <TooltipProvider>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isCollapsed={effectiveCollapsed}
              isActive={pathname === item.href}
              onClick={onNavClick}
            />
          ))}
        </TooltipProvider>
      </nav>

      {/* Footer with Sign Out */}
      <div className="mt-auto border-t border-border/50 p-3">
        <TooltipProvider>
          {effectiveCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSignOut}
                  className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Sign Out
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={onSignOut}
              className={cn(
                "w-full justify-start gap-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                mobile && "h-12 text-base"
              )}
            >
              <LogOut className={cn("h-5 w-5", mobile && "h-5 w-5")} />
              Sign Out
            </Button>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

export function Sidebar({ onSignOut, userEmail }: SidebarProps) {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } =
    useSidebarContext();

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const closeMobile = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-gradient-to-b from-background via-background to-muted/30 [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SidebarContent
            mobile
            onSignOut={() => {
              closeMobile();
              onSignOut();
            }}
            onNavClick={closeMobile}
            onClose={closeMobile}
            userEmail={userEmail}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/50 bg-gradient-to-b from-background via-background to-muted/20 transition-all duration-300 ease-in-out md:flex",
          isCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        <SidebarContent onSignOut={onSignOut} userEmail={userEmail} />

        {/* Collapse Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleCollapse}
          className={cn(
            "absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border border-border/50 bg-background shadow-md transition-transform duration-200 hover:scale-110 hover:bg-accent",
            isCollapsed && "rotate-180"
          )}
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="sr-only">
            {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
        </Button>
      </aside>
    </>
  );
}

export function MobileSidebarTrigger() {
  const { setIsMobileOpen } = useSidebarContext();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0 md:hidden"
      onClick={() => setIsMobileOpen(true)}
    >
      <Menu className="h-5 w-5" />
      <span className="sr-only">Open menu</span>
    </Button>
  );
}
