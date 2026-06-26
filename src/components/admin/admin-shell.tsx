"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, CalendarCheck, Users, Package, Plus,
  BarChart3, Settings, Tag, Clock, UserCheck, Handshake,
  Image, FileText, ChevronLeft, ChevronRight, Menu, X,
  QrCode, AlertTriangle, ShieldCheck, ClipboardList, Palette,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/auth/user-menu";
import type { UserRole } from "@prisma/client";
import type { LogoData } from "@/components/shared/site-logo";
import { LogoMark } from "@/components/shared/site-logo";
import type { PermissionModule } from "@/lib/auth/permissions";

interface AdminShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatarUrl?: string | null;
  };
  logo?: LogoData;
  permissions: string[];
  children: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  module: PermissionModule;
  badge?: number;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard",     href: "/admin/dashboard",  icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Bookings",      href: "/admin/bookings",   icon: CalendarCheck, module: "bookings" },
      { label: "Walk-in",       href: "/admin/bookings/walk-in", icon: Plus, module: "bookings" },
      { label: "Check-in",      href: "/admin/check-in",   icon: QrCode, module: "bookings" },
      { label: "Waivers",       href: "/admin/waivers",    icon: ShieldCheck, module: "bookings" },
      { label: "Customers",     href: "/admin/customers",  icon: Users, module: "customers" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "Packages",      href: "/admin/packages",   icon: Package, module: "catalog" },
      { label: "Add-ons",       href: "/admin/add-ons",    icon: Tag, module: "catalog" },
      { label: "Time Slots",    href: "/admin/slots",      icon: Clock, module: "slots" },
      { label: "Price Engine",  href: "/admin/pricing",    icon: BarChart3, module: "payments" },
    ],
  },
  {
    title: "Partners",
    items: [
      { label: "Agents",        href: "/admin/agents",     icon: UserCheck, module: "agents" },
      { label: "Affiliates",    href: "/admin/affiliates", icon: Handshake, module: "affiliates" },
    ],
  },
  {
    title: "Media",
    items: [
      { label: "Website Media", href: "/admin/media/website",          icon: Image, module: "gallery" },
      { label: "Customer Media",href: "/admin/media/customer-delivery", icon: ClipboardList, module: "media" },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Pages & CMS",   href: "/admin/cms",        icon: FileText, module: "settings" },
      { label: "FAQ",           href: "/admin/cms/faq",    icon: AlertTriangle, module: "settings" },
      { label: "Policies",      href: "/admin/cms/policies",icon: ShieldCheck, module: "settings" },
    ],
  },
  {
    title: "Reporting",
    items: [
      { label: "Reports",       href: "/admin/reports",    icon: BarChart3, module: "reports" },
      { label: "Audit Log",     href: "/admin/audit-log",  icon: ClipboardList, module: "audit" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Staff",         href: "/admin/users",           icon: Users, module: "staff" },
      { label: "Roles & Permissions", href: "/admin/roles",     icon: KeyRound, module: "roles" },
      { label: "Settings",      href: "/admin/settings",        icon: Settings, module: "settings" },
      { label: "Theme & Style", href: "/admin/settings/theme",  icon: Palette, module: "settings" },
    ],
  },
];

export function AdminShell({ user, logo, permissions, children }: AdminShellProps) {
  const defaultLogo: LogoData = { url: "", size: "sm", text: "Zipline MV" };
  const pathname        = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);

  const isActive = (href: string) =>
    href === "/admin/dashboard"
      ? pathname === "/admin/dashboard" || pathname === "/admin"
      : pathname.startsWith(href);
  const canView = (module: PermissionModule) => permissions.includes(`${module}.view`);
  const visibleSections = NAV_SECTIONS
    .map((section) => ({ ...section, items: section.items.filter((item) => canView(item.module)) }))
    .filter((section) => section.items.length > 0);

  const Sidebar = (
    <aside
      className={cn(
        "flex flex-col h-full bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-4 border-b border-border flex-shrink-0",
        collapsed && "justify-center px-2"
      )}>
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0">
          <LogoMark logo={{ ...(logo ?? defaultLogo), size: "sm" }} />
          {!collapsed && !(logo?.url) && (
            <div className="min-w-0">
              <p className="text-sm font-display font-bold text-foreground leading-tight truncate">
                Zipline MV
              </p>
              <p className="text-[10px] text-muted-foreground truncate">Admin Portal</p>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 no-scrollbar">
        {visibleSections.map((section) => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-4 py-2">
                {section.title}
              </p>
            )}
            {collapsed && <div className="h-2" />}
            {section.items.map((item) => {
              const Icon    = item.icon;
              const active  = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "sidebar-link mx-2 mb-0.5",
                    active && "sidebar-link-active",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}
                  {!collapsed && item.badge != null && (
                    <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle + user */}
      <div className="flex-shrink-0 border-t border-border p-3 space-y-2">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "flex items-center justify-center w-full rounded-lg py-1.5 px-2 text-xs",
            "text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-1.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <UserMenu
          name={user.name}
          email={user.email}
          role={user.role}
          avatarUrl={user.avatarUrl}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        {Sidebar}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 flex flex-shrink-0">
            {Sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <LogoMark logo={{ ...(logo ?? defaultLogo), size: "sm" }} />
            {!(logo?.url) && <span className="font-display font-bold text-sm text-foreground">Zipline MV</span>}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
