import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAgent } from "@/lib/agent/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AgentNewBookingForm } from "@/components/agent/bookings/agent-new-booking-form";

export const metadata: Metadata = { title: "New Booking | Agent Portal" };

async function getFormData() {
  const [packages, addOns] = await Promise.all([
    prisma.package.findMany({
      where: { active: true, agentCommissionEligible: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.addOn.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  return { packages, addOns };
}

export default async function AgentNewBookingPage() {
  const { agent } = await getApprovedAgent();
  const { packages, addOns } = await getFormData();

  return (
    <div>
      <PageHeader
        title="New Booking"
        description={`Creating as ${agent.businessName} · Commission calculated from your agent rules`}
        actions={
          <Link href="/agents/bookings" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to bookings
          </Link>
        }
      />
      <div className="p-6 max-w-3xl">
        <AgentNewBookingForm
          packages={packages}
          addOns={addOns}
          agentId={agent.id}
          agentBusinessName={agent.businessName}
          commissionRate={Number(agent.commissionRate)}
          commissionBasis={agent.commissionBasis}
          touristCommissionType={agent.touristCommissionType}
          touristCommissionValue={agent.touristCommissionValue == null ? null : Number(agent.touristCommissionValue)}
          localCommissionType={agent.localCommissionType}
          localCommissionValue={agent.localCommissionValue == null ? null : Number(agent.localCommissionValue)}
          addOnCommissionType={agent.addOnCommissionType}
          addOnCommissionValue={agent.addOnCommissionValue == null ? null : Number(agent.addOnCommissionValue)}
          addOnCommissions={(agent as any).addOnCommissions?.map((c: any) => ({
            addOnId: c.addOnId,
            type: c.type,
            value: Number(c.value),
            localType: c.localType,
            localValue: c.localValue == null ? null : Number(c.localValue),
          })) ?? []}
          canMakeUnpaidBookings={agent.canMakeUnpaidBookings}
        />
      </div>
    </div>
  );
}
