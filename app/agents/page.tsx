import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AgentLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <DashboardShell title="Agent portal" subtitle="Register, log in, create customer bookings, view agent-specific rates, and track payable commission." nav={["Login", "Registration", "Dashboard", "Rate card"]}>
      <div className="grid gap-5 md:grid-cols-2">
        <AuthForm
          mode="sign-in"
          role="agent"
          title="Agent login"
          submitLabel="Login as agent"
          redirectTo="/agents/dashboard"
          error={params.error}
          message={params.message}
        />
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Become an agent</h2>
          <p className="mt-3 text-ocean-950/65">Submit a registration request for approval and receive a rate card after verification.</p>
          <Link href="/agents/register" className="mt-5 inline-flex rounded-full bg-ocean-950 px-5 py-3 font-bold text-white">Register agency</Link>
        </div>
      </div>
    </DashboardShell>
  );
}
