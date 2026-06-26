"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { ApplicationStatus, UserStatus } from "@prisma/client";
import { sendAgentApprovalNotification } from "@/lib/notifications/email";

export async function approveAgent(applicationId: string) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);

  const application = await prisma.agentApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, businessName: true, contactPerson: true, email: true, phone: true, island: true, businessType: true, address: true, website: true },
  });
  if (!application) return { success: false, error: "Application not found" };

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: application.email } });
  if (!user) return { success: false, error: "User account not found" };

  await prisma.$transaction([
    prisma.agentApplication.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.APPROVED, reviewedAt: new Date() },
    }),
    prisma.agent.upsert({
      where:  { userId: user.id },
      update: { status: ApplicationStatus.APPROVED, approvedAt: new Date() },
      create: {
        userId:          user.id,
        applicationId,
        businessName:    application.businessName,
        contactPerson:   application.contactPerson,
        email:           application.email,
        phone:           application.phone,
        island:          application.island,
        businessType:    application.businessType,
        address:         application.address,
        website:         application.website,
        commissionRate:  10,
        status:          ApplicationStatus.APPROVED,
        approvedAt:      new Date(),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data:  { status: UserStatus.ACTIVE },
    }),
    prisma.auditLog.create({
      data: {
        userId:   admin.id,
        action:   "AGENT_APPROVED",
        module:   "agents",
        recordId: applicationId,
        newValue: { businessName: application.businessName },
      },
    }),
  ]);

  // Send approval email (fire and forget)
  const newAgent = await prisma.agent.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (newAgent) sendAgentApprovalNotification(newAgent.id).catch(console.error);

  revalidatePath("/admin/agents");
  return { success: true };
}

export async function rejectAgent(applicationId: string, reason?: string) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);

  await prisma.agentApplication.update({
    where: { id: applicationId },
    data:  { status: ApplicationStatus.REJECTED, adminNotes: reason, reviewedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "AGENT_REJECTED", module: "agents", recordId: applicationId, newValue: { reason } },
  });

  revalidatePath("/admin/agents");
  return { success: true };
}

export async function suspendAgent(agentId: string, reason?: string) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);

  const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true } });
  if (!agent) return { success: false, error: "Agent not found" };

  await prisma.$transaction([
    prisma.agent.update({ where: { id: agentId }, data: { status: ApplicationStatus.SUSPENDED, notes: reason } }),
    prisma.user.update({ where: { id: agent.userId }, data: { status: UserStatus.SUSPENDED } }),
    prisma.auditLog.create({ data: { userId: admin.id, action: "AGENT_SUSPENDED", module: "agents", recordId: agentId, newValue: { reason } } }),
  ]);

  revalidatePath("/admin/agents");
  return { success: true };
}

type AgentCommissionInput = {
  commissionRate: number;
  commissionBasis: string;
  touristCommissionType?: string | null;
  touristCommissionValue?: number | null;
  localCommissionType?: string | null;
  localCommissionValue?: number | null;
  addOnCommissionType?: string | null;
  addOnCommissionValue?: number | null;
};

function normalizeCommission(type?: string | null, value?: number | null) {
  return {
    type:  value != null && value > 0 ? (type ?? "PERCENTAGE") : null,
    value: value != null && value > 0 ? value : null,
  };
}

export async function updateAgentCommission(agentId: string, input: AgentCommissionInput) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);
  const tourist = normalizeCommission(input.touristCommissionType, input.touristCommissionValue);
  const local   = normalizeCommission(input.localCommissionType, input.localCommissionValue);
  const addOn   = normalizeCommission(input.addOnCommissionType, input.addOnCommissionValue);

  await prisma.agent.update({
    where: { id: agentId },
    data:  {
      commissionRate:          input.commissionRate,
      commissionBasis:         input.commissionBasis as any,
      touristCommissionType:   tourist.type as any,
      touristCommissionValue:  tourist.value,
      localCommissionType:     local.type as any,
      localCommissionValue:    local.value,
      addOnCommissionType:     addOn.type as any,
      addOnCommissionValue:    addOn.value,
    },
  });

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "AGENT_COMMISSION_UPDATED", module: "agents", recordId: agentId, newValue: input as any },
  });

  revalidatePath("/admin/agents");
  return { success: true };
}
