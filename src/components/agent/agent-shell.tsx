"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarCheck, Users, DollarSign,
  ShieldCheck, User, Plus, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";
import type { UserRole } from "@prisma/client";

interface AgentShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
    agent?: { id: string; businessName: string; status: string } | null;
  };
  children: React.ReactNode;
}

const NAV = [
  { label: "Dashboard",     href: "/agents/dashboard",  icon: LayoutDashboard },
  { label: "New Booking",   href: "/agents/bookings/new", icon: Plus },
  { label: "My Bookings",   href: "/agents/bookings",   icon: CalendarCheck },
  { label: "My Customers",  href: "/agents/customers",  icon: Users },
  { label: "Waivers",       href: "/agents/waivers",    icon: ShieldCheck },
  { label: "Commission",    href: "/agents/commission", icon: DollarSign },
  { label: "Profile",       href: "/agents/profile",    icon: User },
];

export function AgentShell({ user, children }: AgentShellProps) {
  const pathname    = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/agents/dashboard" ? pathname === href : pathname.startsWith(href);

  const Sidebar = (
    <aside className="flex flex-col h-full w-[220px] bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 17L12 3L21 17" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-display font-bold text-foreground leading-tight">Agent Portal</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {user.agent?.businessName ?? "Zipline MV"}
          </p>
        </div>
      </div>

      {/* Nav */}
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

      {/* User */}
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
          <span className="font-display font-bold text-sm">Agent Portal</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
