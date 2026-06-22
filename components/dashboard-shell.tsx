"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarCheck,
  Camera,
  CreditCard,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
  Waves,
  type LucideIcon
} from "lucide-react";
import clsx from "clsx";
import { signOut } from "@/lib/auth/actions";

const adminLinks: Record<string, string> = {
  Affiliates: "/admin/affiliates",
  Agents: "/admin/agents",
  All: "/admin/bookings",
  Approved: "/admin/roles",
  Bookings: "/admin/bookings",
  Captions: "/admin/media",
  Codes: "/admin/affiliates",
  Commission: "/admin/commissions",
  Customers: "/admin/customers",
  Daily: "/admin/reports",
  Dashboard: "/admin",
  Default: "/admin/pricing",
  "Export CSV": "/admin/bookings",
  Gallery: "/admin/media",
  Hero: "/admin/media",
  Media: "/admin/media",
  Monthly: "/admin/reports",
  Paid: "/admin/bookings",
  Pending: "/admin/roles",
  Pricing: "/admin/pricing",
  Reports: "/admin/reports",
  Roles: "/admin/roles",
  Settings: "/admin/settings",
  Theme: "/admin/theme",
  Upload: "/admin/media"
};

const portalLinks: Record<string, string> = {
  Admin: "/admin",
  Affiliates: "/affiliates",
  Agents: "/agents",
  Bookings: "/agents/dashboard",
  Clicks: "/affiliates/dashboard",
  Code: "/affiliates/dashboard",
  Commission: "/agents/dashboard",
  Dashboard: "/agents/dashboard",
  "Create booking": "/book",
  Login: "/login",
  Registration: "/agents/register",
  Reports: "/agents/dashboard",
  "Rate Card": "/agents/dashboard",
  "Portal access": "/login",
  "Email verification": "/auth/resend-confirmation",
  "New password": "/auth/reset-password",
  "Sign in": "/login"
};

const iconMap: Record<string, LucideIcon> = {
  Affiliates: Waves,
  Agents: Users,
  Bookings: CalendarCheck,
  Clicks: BarChart3,
  Code: Ticket,
  Commission: DollarSign,
  Customers: UserRound,
  Dashboard: Home,
  Media: Camera,
  Pricing: CreditCard,
  Reports: FileText,
  Roles: ShieldCheck,
  Settings,
  Theme: Settings
};

const hiddenAdminPrimaryNav = new Set(["Customers", "Agents", "Affiliates"]);

export function DashboardShell({
  title,
  subtitle,
  nav,
  showSignOut = false,
  children
}: {
  title: string;
  subtitle: string;
  nav: string[];
  showSignOut?: boolean;
  children: React.ReactNode;
}) {
  const [leftPanelHidden, setLeftPanelHidden] = useState(false);
  const isAdmin = title.toLowerCase().includes("admin") || title.toLowerCase().includes("management") || title.toLowerCase().includes("reports") || title.toLowerCase().includes("role") || title.toLowerCase().includes("pricing") || title.toLowerCase().includes("settings");
  const isAffiliate = title.toLowerCase().includes("affiliate");
  const kicker = isAdmin ? "Operations" : isAffiliate ? "Partner portal" : "Zipline portal";
  const initials = isAdmin ? "AD" : isAffiliate ? "AF" : "AG";
  const navigation = (isAdmin && !nav.includes("Dashboard") ? ["Dashboard", ...nav] : nav).filter(
    (item, index, items) =>
      !["Pricing", "Theme", "Roles"].includes(item) &&
      !(isAdmin && hiddenAdminPrimaryNav.has(item)) &&
      items.indexOf(item) === index
  );

  useEffect(() => {
    setLeftPanelHidden(window.localStorage.getItem("zipline-left-panel-hidden") === "true");
  }, []);

  function toggleLeftPanel() {
    setLeftPanelHidden((current) => {
      const next = !current;
      window.localStorage.setItem("zipline-left-panel-hidden", String(next));
      return next;
    });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ocean-50 text-ocean-950">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(19,214,198,0.28),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(255,138,76,0.20),transparent_28%),linear-gradient(135deg,#ecfeff_0%,#f8fdff_48%,#dff7f8_100%)]" />
      <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-4 py-4 md:px-6 lg:p-8">
        <aside className={clsx("glass sticky top-8 hidden h-[calc(100vh-4rem)] w-72 shrink-0 rounded-3xl p-5 shadow-[0_28px_90px_rgba(8,51,68,0.12)] transition-all duration-300 lg:block", leftPanelHidden && "lg:hidden")}>
          <Link href={isAdmin ? "/admin" : "/"} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-ocean-950 to-ocean-700 text-white shadow-glow">
              <Waves className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black">Zipline</span>
              <span className="block text-xs font-black uppercase tracking-[0.18em] text-ocean-950/45">Maldives</span>
            </span>
          </Link>

          <nav className="mt-8 grid gap-2" aria-label="Dashboard navigation">
            {navigation.map((item, index) => {
              const href = getHref(item, isAdmin, isAffiliate);
              const Icon = iconMap[item] ?? (index === 0 ? Home : Menu);
              const active = isActiveNavItem(item, title, isAdmin, index);

              return (
                <Link
                  key={item}
                  href={href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
                    active ? "bg-gradient-to-r from-ocean-700 to-lagoon text-white shadow-glow" : "text-ocean-950/65 hover:bg-white/75 hover:text-ocean-950"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item}
                </Link>
              );
            })}
          </nav>

          {showSignOut ? (
            <form action={signOut} className="absolute inset-x-5 bottom-5">
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ocean-950 px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="glass sticky top-4 z-20 rounded-3xl p-4 shadow-[0_20px_60px_rgba(8,51,68,0.08)] lg:top-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={toggleLeftPanel}
                  className="mt-1 hidden h-11 w-11 shrink-0 place-items-center rounded-full bg-white/75 text-ocean-700 shadow-sm transition hover:bg-white lg:grid"
                  aria-label={leftPanelHidden ? "Show left panel" : "Hide left panel"}
                  title={leftPanelHidden ? "Show left panel" : "Hide left panel"}
                >
                  {leftPanelHidden ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-lagoon">{kicker}</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight text-ocean-950 md:text-5xl">{title}</h1>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ocean-950/60">{subtitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-ocean-950/45 shadow-inner md:flex">
                  <Search className="h-4 w-4" />
                  Search
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-full bg-white/75 text-ocean-700 shadow-sm" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 rounded-full bg-white/75 py-1.5 pl-1.5 pr-4 shadow-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-lagoon to-ocean-700 text-sm font-black text-white">{initials}</span>
                  <span className="text-sm font-black">{isAdmin ? "Admin" : isAffiliate ? "Affiliate" : "Agent"}</span>
                </div>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Mobile dashboard navigation">
              {navigation.map((item, index) => (
                <Link
                  key={item}
                  href={getHref(item, isAdmin, isAffiliate)}
                  className={clsx(
                    "whitespace-nowrap rounded-full px-4 py-2 text-sm font-black",
                    isActiveNavItem(item, title, isAdmin, index) ? "bg-ocean-950 text-white" : "bg-white/75 text-ocean-950/65"
                  )}
                >
                  {item}
                </Link>
              ))}
              {showSignOut ? (
                <form action={signOut}>
                  <button className="whitespace-nowrap rounded-full bg-ocean-950 px-4 py-2 text-sm font-black text-white">Sign out</button>
                </form>
              ) : null}
            </nav>
          </header>

          <section className="py-6 lg:py-8">{children}</section>
        </div>
      </div>
    </main>
  );
}

function getHref(item: string, isAdmin: boolean, isAffiliate: boolean) {
  if (isAdmin) return adminLinks[item] ?? "/admin";
  if (isAffiliate) {
    return {
      ...portalLinks,
      Bookings: "/affiliates/dashboard",
      Commission: "/affiliates/dashboard",
      Dashboard: "/affiliates/dashboard",
      Registration: "/affiliates/register",
      Reports: "/affiliates/dashboard"
    }[item] ?? "/affiliates";
  }

  return portalLinks[item] ?? "#";
}

function isActiveNavItem(item: string, title: string, isAdmin: boolean, index: number) {
  const normalizedTitle = title.toLowerCase();
  const normalizedItem = item.toLowerCase();

  if (isAdmin) {
    if (item === "Dashboard") return normalizedTitle === "admin dashboard";
    if (item === "Settings") return ["settings", "pricing", "theme", "role"].some((word) => normalizedTitle.includes(word));
    return normalizedTitle.includes(normalizedItem);
  }

  return index === 0 || normalizedTitle.includes(normalizedItem);
}
