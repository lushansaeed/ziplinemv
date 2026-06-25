import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { FINANCE_ACCESS } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(FINANCE_ACCESS);
  if (!auth.ok) return auth.response;

  const { code, discountType, discountValue, maxUses, validFrom, validTo, description } = await req.json();

  const existing = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) return NextResponse.json({ error: "This code already exists." }, { status: 409 });

  const promo = await prisma.promoCode.create({
    data: {
      code:          code.toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      maxUses:       maxUses ? parseInt(maxUses) : null,
      validFrom:     validFrom ? new Date(validFrom) : null,
      validTo:       validTo   ? new Date(validTo)   : null,
      description,
      active:        true,
    },
  });

  return NextResponse.json(promo, { status: 201 });
}
