import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminMetrics } from "@/lib/data";

export default function AdminPage() {
  return (
    <DashboardShell title="Admin dashboard" subtitle="Manage bookings, customers, agents, affiliates, pricing, time slots, media, commissions, reports, roles, themes, and audit logs." nav={["Bookings", "Pricing", "Media", "Commission", "Reports", "Theme", "Roles"]} showSignOut>
      <div className="grid gap-5 md:grid-cols-4">
        {adminMetrics.map((metric) => (
          <div key={metric.label} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-ocean-950/55">{metric.label}</p>
            <p className="mt-2 text-3xl font-black">{metric.value}</p>
            <p className="mt-1 text-sm font-bold text-ocean-700">{metric.trend}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-6">
        {[
          ["/admin/bookings", "Booking management"],
          ["/admin/pricing", "Pricing management"],
          ["/admin/media", "Media management"],
          ["/admin/commissions", "Commission management"],
          ["/admin/reports", "Reports"],
          ["/admin/theme", "Theme settings"],
          ["/admin/roles", "Role approvals"]
        ].map(([href, label]) => (
          <Link key={href} href={href} className="rounded-[2rem] bg-white p-5 font-black shadow-sm">{label}</Link>
        ))}
      </div>
    </DashboardShell>
  );
}
