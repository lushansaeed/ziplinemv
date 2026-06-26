import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("catalog", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const old = await prisma.addOn.findUnique({ where: { id: params.id } });
  const {
    id: _id, activityId: _a, createdAt: _c, updatedAt: _u,
    price, localPriceMvr, agentCommissionValue,
    ...rest
  } = body;
  const addon = await prisma.addOn.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(price         !== undefined ? { price:         parseFloat(price) }                   : {}),
      ...(localPriceMvr !== undefined ? { localPriceMvr: localPriceMvr ? parseFloat(localPriceMvr) : null } : {}),
      ...(agentCommissionValue !== undefined ? {
        agentCommissionType:  agentCommissionValue ? (rest.agentCommissionType ?? "PERCENTAGE") : null,
        agentCommissionValue: agentCommissionValue ? parseFloat(agentCommissionValue) : null,
      } : {}),
    },
  });
  await logAudit({ userId: auth.dbUser.id, action: "ADD_ON_UPDATED", module: "catalog", recordId: params.id, oldValue: old, newValue: addon });
  return NextResponse.json(addon);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("catalog", "delete");
  if (!auth.ok) return auth.response;

  const old = await prisma.addOn.findUnique({ where: { id: params.id } });
  await prisma.addOn.update({ where: { id: params.id }, data: { active: false } });
  await logAudit({ userId: auth.dbUser.id, action: "ADD_ON_ARCHIVED", module: "catalog", recordId: params.id, oldValue: old, newValue: { active: false } });
  return NextResponse.json({ success: true });
}
