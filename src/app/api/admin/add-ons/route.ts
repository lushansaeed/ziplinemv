import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("catalog", "create");
  if (!auth.ok) return auth.response;

  const {
    activityId, name, description, price, localPriceMvr, currency, bestFor, rules,
    agentCommissionEligible, agentCommissionType, agentCommissionValue,
    displayOrder, active,
  } = await req.json();

  if (!activityId || !name || price === undefined) {
    return NextResponse.json({ error: "activityId, name and price are required" }, { status: 400 });
  }

  const addon = await prisma.addOn.create({
    data: {
      activityId,
      name,
      description:   description || null,
      price:         parseFloat(price),
      localPriceMvr: localPriceMvr ? parseFloat(localPriceMvr) : null,
      currency:      currency ?? "USD",
      bestFor:       bestFor || null,
      rules:         rules || null,
      agentCommissionEligible: agentCommissionEligible ?? true,
      agentCommissionType:     agentCommissionValue ? (agentCommissionType ?? "PERCENTAGE") : null,
      agentCommissionValue:    agentCommissionValue ? parseFloat(agentCommissionValue) : null,
      displayOrder:  displayOrder ?? 0,
      active:        active ?? true,
    },
  });
  await logAudit({ userId: auth.dbUser.id, action: "ADD_ON_CREATED", module: "catalog", recordId: addon.id, newValue: addon });

  return NextResponse.json(addon, { status: 201 });
}
