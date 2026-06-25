import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id: _id, activityId: _a, createdAt: _c, updatedAt: _u, price, localPriceMvr, ...rest } = body;
  const addon = await prisma.addOn.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(price         !== undefined ? { price:         parseFloat(price) }                   : {}),
      ...(localPriceMvr !== undefined ? { localPriceMvr: localPriceMvr ? parseFloat(localPriceMvr) : null } : {}),
    },
  });
  return NextResponse.json(addon);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const count = await prisma.bookingAddOn.count({ where: { addOnId: params.id } });
  if (count > 0) return NextResponse.json({ error: "Add-on has bookings" }, { status: 409 });

  await prisma.addOn.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
