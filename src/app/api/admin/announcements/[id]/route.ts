import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const keys = Object.keys(body);
  const isPublishOnly = keys.length > 0 && keys.every((key) => key === "active");
  const auth = await requireApiPermission("website_customization", isPublishOnly ? "publish" : "update");
  if (!auth.ok) return auth.response;
  const announcement = await prisma.announcement.update({ where: { id: params.id }, data: body });
  return NextResponse.json(announcement);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiPermission("website_customization", "delete");
  if (!auth.ok) return auth.response;

  await prisma.announcement.update({ where: { id: params.id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
