import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("slots", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const template = await prisma.slotTemplate.update({ where: { id: params.id }, data: body });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("slots", "delete");
  if (!auth.ok) return auth.response;

  await prisma.slotTemplate.update({ where: { id: params.id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
