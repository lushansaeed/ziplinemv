import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { activityId, name, slug, description, touristPrice, localPrice, childPrice,
          currency, included, excluded, featured, active, displayOrder,
          agentCommissionEligible, affiliateCommissionEligible } = body;

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
      childPrice:                 childPrice ? parseFloat(childPrice) : null,
      currency:                   currency ?? "USD",
      included:                   included ?? [],
      excluded:                   excluded ?? [],
      featured:                   featured ?? false,
      active:                     active ?? true,
      displayOrder:               displayOrder ?? 0,
      agentCommissionEligible:    agentCommissionEligible ?? true,
      affiliateCommissionEligible: affiliateCommissionEligible ?? true,
    },
  });

  return NextResponse.json(pkg, { status: 201 });
}
