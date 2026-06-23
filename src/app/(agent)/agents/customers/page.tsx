import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentCustomersTable } from "@/components/agent/customers/agent-customers-table";

export const metadata: Metadata = { title: "My Customers | Agent Portal" };

async function getAgentCustomers(agentId: string) {
  return prisma.customer.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { bookings: true } },
    },
  });
}

export default async function AgentCustomersPage() {
  const { agent } = await getApprovedAgent();
  const customers = await getAgentCustomers(agent.id);
  return (
    <div>
      <PageHeader title="My Customers" description={`${customers.length} customers booked through you`} />
      <AgentCustomersTable customers={customers} />
    </div>
  );
}
