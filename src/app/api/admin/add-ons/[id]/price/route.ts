import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("payments", "edit");
  if (!auth.ok) return auth.response;

  const { price, localPriceMvr } = await req.json();
  await prisma.addOn.update({
    where: { id: params.id },
    data:  { price, localPriceMvr: localPriceMvr ?? null },
  });
  return NextResponse.json({ success: true });
}
