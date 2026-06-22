import { DashboardShell } from "@/components/dashboard-shell";
import { AdminRoleRequestsWorkspace } from "@/components/admin-role-requests-workspace";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RoleApprovalsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const agents = await db.agent.findMany({
    include: { user: true },
    orderBy: { id: "desc" }
  });
  const affiliates = await db.affiliate.findMany({
    include: { user: true, codes: true },
    orderBy: { id: "desc" }
  });

  return (
    <DashboardShell title="Settings" subtitle="Pricing, themes, and roles." nav={["Settings"]} showSignOut>
      <div className="grid gap-4">
        {params.message ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{params.message}</p> : null}
        {params.error ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{params.error}</p> : null}
      </div>
      <SettingsNav active="Roles" />

      <AdminRoleRequestsWorkspace
        agentRows={agents.map((agent) => ({
          id: agent.userId,
          role: "agent",
          primaryName: agent.agencyName,
          contactPerson: agent.user.name ?? "",
          email: agent.user.email,
          phone: "",
          requestedDate: agent.user.createdAt.toISOString(),
          status: agent.isSuspended ? "Rejected" : agent.isApproved ? "Approved" : "Pending"
        }))}
        affiliateRows={affiliates.map((affiliate) => ({
          id: affiliate.userId,
          role: "affiliate",
          primaryName: affiliate.displayName,
          email: affiliate.user.email,
          phone: "",
          requestedDate: affiliate.user.createdAt.toISOString(),
          status: affiliate.isApproved ? "Approved" : "Pending"
        }))}
      />
    </DashboardShell>
  );
}

function SettingsNav({ active }: { active: "Pricing" | "Themes" | "Roles" }) {
  const items = [
    ["Pricing", "/admin/pricing"],
    ["Themes", "/admin/theme"],
    ["Roles", "/admin/roles"]
  ] as const;
  return (
    <nav className="mt-6 flex flex-wrap gap-2 rounded-3xl bg-white/75 p-2 shadow-sm">
      {items.map(([label, href]) => (
        <a key={label} href={href} className={`rounded-2xl px-5 py-3 text-sm font-black ${active === label ? "bg-ocean-950 text-white shadow-glow" : "text-ocean-950/60 hover:bg-white"}`}>{label}</a>
      ))}
    </nav>
  );
}
