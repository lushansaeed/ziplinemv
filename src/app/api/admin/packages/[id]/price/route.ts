import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("payments", "edit");
  if (!auth.ok) return auth.response;

  const { touristPrice, localPrice, localPriceMvr } = await req.json();
  await prisma.package.update({
    where: { id: params.id },
    data:  { touristPrice, localPrice: localPrice ?? null, localPriceMvr: localPriceMvr ?? null },
  });
  return NextResponse.json({ success: true });
}
