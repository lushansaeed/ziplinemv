import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  // Strip read-only / relational fields that Prisma won't accept in update
  const {
    id: _id, activityId: _activityId, createdAt: _c, updatedAt: _u, _count: _cnt,
    touristPrice, localPrice, childPrice,
    ...rest
  } = body;

  const pkg = await prisma.package.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(touristPrice !== undefined ? { touristPrice: parseFloat(touristPrice) } : {}),
      ...(localPrice   !== undefined ? { localPrice:   localPrice   ? parseFloat(localPrice)   : null } : {}),
      ...(childPrice   !== undefined ? { childPrice:   childPrice   ? parseFloat(childPrice)   : null } : {}),
    },
  });

  return NextResponse.json(pkg);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const count = await prisma.booking.count({ where: { packageId: params.id } });
  if (count > 0) return NextResponse.json({ error: "Package has bookings" }, { status: 409 });

  await prisma.package.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
