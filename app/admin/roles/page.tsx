import { DashboardShell } from "@/components/dashboard-shell";
import { approvePortalUser, rejectPortalUser } from "@/lib/auth/actions";
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
    <DashboardShell title="Role approvals" subtitle="Approve verified agent and affiliate requests, sync Supabase app roles, and keep an audit trail." nav={["Pending", "Approved", "Rejected"]} showSignOut>
      <div className="grid gap-4">
        {params.message ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-ocean-700 shadow-sm">{params.message}</p> : null}
        {params.error ? <p className="rounded-2xl bg-white p-4 text-sm font-bold text-red-600 shadow-sm">{params.error}</p> : null}
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <ApprovalList
          title="Agent requests"
          empty="No agent registrations yet."
          rows={agents.map((agent) => ({
            id: agent.userId,
            role: "agent",
            name: agent.agencyName,
            email: agent.user.email,
            status: agent.isSuspended ? "Rejected" : agent.isApproved ? "Approved" : "Pending"
          }))}
        />
        <ApprovalList
          title="Affiliate requests"
          empty="No affiliate registrations yet."
          rows={affiliates.map((affiliate) => ({
            id: affiliate.userId,
            role: "affiliate",
            name: affiliate.displayName,
            email: affiliate.user.email,
            status: affiliate.isApproved ? "Approved" : "Pending",
            detail: affiliate.codes[0]?.code ? `Code: ${affiliate.codes[0].code}` : undefined
          }))}
        />
      </section>
    </DashboardShell>
  );
}

function ApprovalList({
  title,
  empty,
  rows
}: {
  title: string;
  empty: string;
  rows: { id: string; role: "agent" | "affiliate"; name: string; email: string; status: string; detail?: string }[];
}) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-black">{title}</h2>
      <div className="mt-5 grid gap-3">
        {rows.length ? (
          rows.map((row) => (
            <article key={`${row.role}-${row.id}`} className="rounded-3xl border border-ocean-950/10 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{row.name}</h3>
                  <p className="text-sm text-ocean-950/60">{row.email}</p>
                  {row.detail ? <p className="mt-1 text-xs font-bold text-ocean-700">{row.detail}</p> : null}
                </div>
                <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-black text-ocean-950">{row.status}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={approvePortalUser}>
                  <input type="hidden" name="userId" value={row.id} />
                  <input type="hidden" name="role" value={row.role} />
                  <button className="rounded-full bg-ocean-950 px-4 py-2 text-sm font-bold text-white">Approve</button>
                </form>
                <form action={rejectPortalUser}>
                  <input type="hidden" name="userId" value={row.id} />
                  <input type="hidden" name="role" value={row.role} />
                  <button className="rounded-full bg-white px-4 py-2 text-sm font-bold text-red-600 ring-1 ring-red-200">Reject</button>
                </form>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-3xl bg-ocean-50 p-4 text-sm font-bold text-ocean-950/60">{empty}</p>
        )}
      </div>
    </div>
  );
}
