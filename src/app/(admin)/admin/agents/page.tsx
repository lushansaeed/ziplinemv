import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { PageHeader } from "@/components/shared/page-header";
import { AgentsWorkspace } from "@/components/admin/agents/agents-workspace";

export const metadata: Metadata = { title: "Agents | Admin" };

async function getAgentsData() {
  const [agents, applications] = await Promise.all([
    prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, lastLoginAt: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.agentApplication.findMany({
      where:   { status: "PENDING" },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  // Commission payable per agent
  const commissionData = await prisma.agentCommission.groupBy({
    by: ["agentId"],
    _sum: { amount: true },
    where: { status: "PENDING" },
  });
  const commissionMap = Object.fromEntries(
    commissionData.map((c) => [c.agentId, Number(c._sum.amount ?? 0)])
  );

  // Total sales per agent
  const salesData = await prisma.booking.groupBy({
    by: ["agentId"],
    _sum: { total: true },
    where: { paymentStatus: "PAID", agentId: { not: null } },
  });
  const salesMap = Object.fromEntries(
    salesData.map((s) => [s.agentId!, Number(s._sum.total ?? 0)])
  );

  return { agents, applications, commissionMap, salesMap };
}

export default async function AgentsPage() {
  await requireRole(ADMIN_AND_ABOVE as any);
  const data = await getAgentsData();
  return (
    <div>
      <PageHeader
        title="Agents"
        description={`${data.agents.length} agents · ${data.applications.length} pending`}
      />
      <AgentsWorkspace {...data} agents={data.agents as any} />
    </div>
  );
}
