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
            reference: true, bookingDate: true, total: true, currency: true,
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
      <AgentCommissionStatement
        {...(data as any)}
        commissionRate={Number(agent.commissionRate)}
        commissionBasis={agent.commissionBasis}
        touristCommissionType={agent.touristCommissionType}
        touristCommissionValue={agent.touristCommissionValue == null ? null : Number(agent.touristCommissionValue)}
        localCommissionType={agent.localCommissionType}
        localCommissionValue={agent.localCommissionValue == null ? null : Number(agent.localCommissionValue)}
        addOnCommissionType={agent.addOnCommissionType}
        addOnCommissionValue={agent.addOnCommissionValue == null ? null : Number(agent.addOnCommissionValue)}
      />
    </div>
  );
}
