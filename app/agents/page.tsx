import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";

export default function AgentLoginPage() {
  return (
    <DashboardShell title="Agent portal" subtitle="Register, log in, create customer bookings, view agent-specific rates, and track payable commission." nav={["Login", "Registration", "Dashboard", "Rate card"]}>
      <div className="grid gap-5 md:grid-cols-2">
        <PortalCard title="Agent login" action="Login as agent" />
        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Become an agent</h2>
          <p className="mt-3 text-ocean-950/65">Submit a registration request for approval and receive a rate card after verification.</p>
          <Link href="/agents/register" className="mt-5 inline-flex rounded-full bg-ocean-950 px-5 py-3 font-bold text-white">Register agency</Link>
        </div>
      </div>
    </DashboardShell>
  );
}

function PortalCard({ title, action }: { title: string; action: string }) {
  return (
    <form className="grid gap-4 rounded-[2rem] bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <input placeholder="Email address" className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
      <input placeholder="Password" type="password" className="rounded-2xl border border-ocean-950/10 px-4 py-3" />
      <Link href="/agents/dashboard" className="rounded-full bg-sunset px-5 py-3 text-center font-bold text-white">{action}</Link>
    </form>
  );
}
