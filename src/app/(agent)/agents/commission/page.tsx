import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentCommissionStatement } from "@/components/agent/commission/agent-commission-statement";

export const metadata: Metadata = { title: "Commission | Agent Portal" };

async function getCommissionData(agentId: string) {
  const [commissions, totals] = await Promise.all([
    prisma.agentCommission.findMany({
      where:   { agentId },
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            reference: true, bookingDate: true, total: true,
            customer: { select: { name: true } },
            package:  { select: { name: true } },
          },
        },
      },
    }),
    prisma.agentCommission.groupBy({
      by: ["status"],
      where: { agentId },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  return { commissions, totals };
}

export default async function AgentCommissionPage() {
  const { agent } = await getApprovedAgent();
  const data = await getCommissionData(agent.id);
  return (
    <div>
      <PageHeader title="Commission" description={`Your current rate: ${agent.commissionRate}%`} />
      <AgentCommissionStatement {...data} commissionRate={Number(agent.commissionRate)} commissionBasis={agent.commissionBasis} />
    </div>
  );
}
