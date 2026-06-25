import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const { activityId, name, description, price, localPriceMvr, currency, bestFor, rules, displayOrder, active } = await req.json();

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
      displayOrder:  displayOrder ?? 0,
      active:        active ?? true,
    },
  });

  return NextResponse.json(addon, { status: 201 });
}
