import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { FINANCE_ACCESS } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(FINANCE_ACCESS);
  if (!auth.ok) return auth.response;

  const { touristPrice, localPrice, localPriceMvr } = await req.json();
  await prisma.package.update({
    where: { id: params.id },
    data:  { touristPrice, localPrice: localPrice ?? null, localPriceMvr: localPriceMvr ?? null },
  });
  return NextResponse.json({ success: true });
}
