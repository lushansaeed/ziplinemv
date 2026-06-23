import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentWaiversTable } from "@/components/agent/waivers/agent-waivers-table";

export const metadata: Metadata = { title: "Waivers | Agent Portal" };

async function getAgentWaivers(agentId: string) {
  return prisma.waiver.findMany({
    where: { booking: { agentId } },
    orderBy: { createdAt: "desc" },
    include: {
      booking: {
        select: {
          reference: true, bookingDate: true,
          customer: { select: { name: true, phone: true } },
          slot:     { select: { startTime: true } },
        },
      },
    },
  });
}

export default async function AgentWaiversPage() {
  const { agent } = await getApprovedAgent();
  const waivers = await getAgentWaivers(agent.id);
  return (
    <div>
      <PageHeader
        title="Waivers"
        description={`${waivers.filter((w) => w.status === "PENDING").length} pending · ${waivers.filter((w) => w.status === "SIGNED").length} signed`}
      />
      <AgentWaiversTable waivers={waivers} />
    </div>
  );
}
