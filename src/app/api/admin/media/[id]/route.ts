import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("gallery", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await prisma.websiteMedia.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("gallery", "delete");
  if (!auth.ok) return auth.response;

  await prisma.websiteMedia.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
