"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Link2, Tag, TrendingUp,
  DollarSign, Download, Image, User, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";
import type { UserRole } from "@prisma/client";

interface AffiliateShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
    affiliate?: { id: string; name: string; status: string } | null;
  };
  children: React.ReactNode;
}

const NAV = [
  { label: "Dashboard",    href: "/affiliate/dashboard",    icon: LayoutDashboard },
  { label: "Referral Links",href: "/affiliate/links",       icon: Link2 },
  { label: "Coupons",      href: "/affiliate/coupons",      icon: Tag },
  { label: "Conversions",  href: "/affiliate/conversions",  icon: TrendingUp },
  { label: "Commission",   href: "/affiliate/commission",   icon: DollarSign },
  { label: "Payouts",      href: "/affiliate/payouts",      icon: Download },
  { label: "Marketing",    href: "/affiliate/marketing",    icon: Image },
  { label: "Profile",      href: "/affiliate/profile",      icon: User },
];

export function AffiliateShell({ user, children }: AffiliateShellProps) {
  const pathname    = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/affiliate/dashboard" ? pathname === href : pathname.startsWith(href);

  const Sidebar = (
    <aside className="flex flex-col h-full w-[220px] bg-card border-r border-border">
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand-citrus/10 border border-brand-citrus/20 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 17L12 3L21 17" stroke="#F5A623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-display font-bold text-foreground leading-tight">Affiliate</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {user.affiliate?.name ?? "Portal"}
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar space-y-0.5">
        {NAV.map((item) => {
          const Icon   = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-link", active && "sidebar-link-active")}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu
          name={user.name}
          email={user.email}
          role={user.role}
          avatarUrl={user.avatarUrl}
        />
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:flex flex-shrink-0">{Sidebar}</div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <span className="font-display font-bold text-sm">Affiliate Portal</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
