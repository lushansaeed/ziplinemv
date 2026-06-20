import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AffiliateLoginPage() {
  return (
    <DashboardShell title="Affiliate portal" subtitle="Generate codes, share booking links, and track clicks, conversions, revenue, and commission." nav={["Login", "Registration", "Dashboard", "Reports"]}>
      <div className="grid gap-5 md:grid-cols-2">
        <form className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Affiliate login</h2>
          <input placeholder="Email address" className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
          <input placeholder="Password" type="password" className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
          <Link href="/affiliates/dashboard" className="rounded-full bg-sunset px-5 py-3 text-center font-bold text-white">Login as affiliate</Link>
        </form>
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Become an affiliate</h2>
          <p className="mt-3 text-ocean-950/65">Apply to receive a unique code and shareable booking link.</p>
          <Link href="/affiliates/register" className="mt-5 inline-flex rounded-full bg-ocean-950 px-5 py-3 font-bold text-white">Register affiliate</Link>
        </div>
      </div>
    </DashboardShell>
  );
}
