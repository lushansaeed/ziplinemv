import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("catalog", "create");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { activityId, name, slug, description, touristPrice, localPrice, localPriceMvr, childPrice,
          currency, included, excluded, featured, active, displayOrder,
          agentCommissionEligible, agentCommissionType, agentCommissionValue,
          affiliateCommissionEligible } = body;

  if (!activityId || !name || !touristPrice) {
    return NextResponse.json({ error: "activityId, name and touristPrice are required" }, { status: 400 });
  }

  // Ensure slug is unique
  const finalSlug = slug || name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-");
  const existing = await prisma.package.findUnique({ where: { slug: finalSlug } });
  if (existing) return NextResponse.json({ error: "A package with this slug already exists" }, { status: 409 });

  const pkg = await prisma.package.create({
    data: {
      activityId, name, slug: finalSlug,
      description:                description || null,
      touristPrice:               parseFloat(touristPrice),
      localPrice:                 localPrice ? parseFloat(localPrice) : null,
      localPriceMvr:              localPriceMvr ? parseFloat(localPriceMvr) : null,
      childPrice:                 childPrice ? parseFloat(childPrice) : null,
      currency:                   currency ?? "USD",
      included:                   included ?? [],
      excluded:                   excluded ?? [],
      featured:                   featured ?? false,
      active:                     active ?? true,
      displayOrder:               displayOrder ?? 0,
      agentCommissionEligible:    agentCommissionEligible ?? true,
      agentCommissionType:        agentCommissionValue ? (agentCommissionType ?? "PERCENTAGE") : null,
      agentCommissionValue:       agentCommissionValue ? parseFloat(agentCommissionValue) : null,
      affiliateCommissionEligible: affiliateCommissionEligible ?? true,
    },
  });
  await logAudit({ userId: auth.dbUser.id, action: "PACKAGE_CREATED", module: "catalog", recordId: pkg.id, newValue: pkg });

  return NextResponse.json(pkg, { status: 201 });
}
