import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { MEDIA_ACCESS } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(MEDIA_ACCESS);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  await prisma.websiteMedia.update({ where: { id: params.id }, data: body });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(MEDIA_ACCESS);
  if (!auth.ok) return auth.response;

  const media = await prisma.websiteMedia.findUnique({ where: { id: params.id } });

  // Delete from Supabase storage
  if (media?.storagePath) {
    const adminClient = createAdminClient();
    await adminClient.storage.from("website-media").remove([media.storagePath]);
  }

  await prisma.websiteMedia.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
