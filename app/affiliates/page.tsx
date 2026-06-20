import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AffiliateLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell title="Affiliate portal" subtitle="Generate codes, share booking links, and track clicks, conversions, revenue, and commission." nav={["Login", "Registration", "Dashboard", "Reports"]}>
      <div className="grid gap-5 md:grid-cols-2">
        <AuthForm
          mode="sign-in"
          role="affiliate"
          title="Affiliate login"
          submitLabel="Login as affiliate"
          redirectTo="/affiliates/dashboard"
          error={params.error}
          message={params.message}
        />
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Become an affiliate</h2>
          <p className="mt-3 text-ocean-950/65">Apply to receive a unique code and shareable booking link.</p>
          <Link href="/affiliates/register" className="mt-5 inline-flex rounded-full bg-ocean-950 px-5 py-3 font-bold text-white">Register affiliate</Link>
        </div>
      </div>
    </DashboardShell>
  );
}
