import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { FINANCE_ACCESS } from "@/lib/auth/roles";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FINANCE_ACCESS);
  if (!auth.ok) return auth.response;

  await prisma.promoCode.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
