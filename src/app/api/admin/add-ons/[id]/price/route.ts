import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { FINANCE_ACCESS } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FINANCE_ACCESS);
  if (!auth.ok) return auth.response;

  const { price, localPriceMvr } = await req.json();
  await prisma.addOn.update({
    where: { id: params.id },
    data:  { price, localPriceMvr: localPriceMvr ?? null },
  });
  return NextResponse.json({ success: true });
}
