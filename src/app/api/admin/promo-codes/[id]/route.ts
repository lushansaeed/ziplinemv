import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("payments", "delete");
  if (!auth.ok) return auth.response;

  await prisma.promoCode.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
