import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { OPERATIONS_AND_ABOVE } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(OPERATIONS_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const slot = await prisma.timeSlot.update({
    where: { id: params.id },
    data:  body,
  });
  return NextResponse.json(slot);
}
