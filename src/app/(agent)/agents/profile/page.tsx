import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentProfile } from "@/components/agent/profile/agent-profile";

export const metadata: Metadata = { title: "Profile | Agent Portal" };

export default async function AgentProfilePage() {
  const { user, agent } = await getApprovedAgent();
  const [packages, addOns] = await Promise.all([
    prisma.package.findMany({
      where: { active: true, agentCommissionEligible: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        touristPrice: true,
        localPriceMvr: true,
        agentCommissionType: true,
        agentCommissionValue: true,
      },
    }),
    prisma.addOn.findMany({
      where: { active: true, agentCommissionEligible: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        localPriceMvr: true,
        agentCommissionType: true,
        agentCommissionValue: true,
      },
    }),
  ]);

  return (
    <div>
      <PageHeader title="Profile" description="Your agent account details." />
      <AgentProfile
        user={user}
        agent={agent}
        packages={packages.map((pkg) => ({
          ...pkg,
          touristPrice: Number(pkg.touristPrice),
          localPriceMvr: pkg.localPriceMvr == null ? null : Number(pkg.localPriceMvr),
          agentCommissionValue: pkg.agentCommissionValue == null ? null : Number(pkg.agentCommissionValue),
        }))}
        addOns={addOns.map((addOn) => ({
          ...addOn,
          price: Number(addOn.price),
          localPriceMvr: addOn.localPriceMvr == null ? null : Number(addOn.localPriceMvr),
          agentCommissionValue: addOn.agentCommissionValue == null ? null : Number(addOn.agentCommissionValue),
        }))}
      />
    </div>
  );
}
