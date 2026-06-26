import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("catalog", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const old = await prisma.package.findUnique({ where: { id: params.id } });

  // Strip read-only / relational fields that Prisma won't accept in update
  const {
    id: _id, activityId: _activityId, createdAt: _c, updatedAt: _u, _count: _cnt,
    touristPrice, localPrice, localPriceMvr, childPrice, agentCommissionValue,
    ...rest
  } = body;

  const pkg = await prisma.package.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(touristPrice !== undefined ? { touristPrice: parseFloat(touristPrice) } : {}),
      ...(localPrice   !== undefined ? { localPrice:   localPrice   ? parseFloat(localPrice)   : null } : {}),
      ...(localPriceMvr !== undefined ? { localPriceMvr: localPriceMvr ? parseFloat(localPriceMvr) : null } : {}),
      ...(childPrice   !== undefined ? { childPrice:   childPrice   ? parseFloat(childPrice)   : null } : {}),
      ...(agentCommissionValue !== undefined ? {
        agentCommissionType:  agentCommissionValue ? (rest.agentCommissionType ?? "PERCENTAGE") : null,
        agentCommissionValue: agentCommissionValue ? parseFloat(agentCommissionValue) : null,
      } : {}),
    },
  });
  await logAudit({ userId: auth.dbUser.id, action: "PACKAGE_UPDATED", module: "catalog", recordId: params.id, oldValue: old, newValue: pkg });

  return NextResponse.json(pkg);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("catalog", "delete");
  if (!auth.ok) return auth.response;

  const old = await prisma.package.findUnique({ where: { id: params.id } });
  await prisma.package.update({ where: { id: params.id }, data: { active: false } });
  await logAudit({ userId: auth.dbUser.id, action: "PACKAGE_ARCHIVED", module: "catalog", recordId: params.id, oldValue: old, newValue: { active: false } });
  return NextResponse.json({ success: true });
}
