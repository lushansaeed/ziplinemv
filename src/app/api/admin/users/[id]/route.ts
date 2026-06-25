import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  // Prevent changing own role
  if (auth.dbUser.id === params.id && body.role) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 403 });
  }

  await prisma.user.update({ where: { id: params.id }, data: body });

  // Sync role to Supabase app metadata, which is not user-editable.
  if (body.role) {
    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (targetUser?.supabaseUid) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(targetUser.supabaseUid, {
        app_metadata: { role: body.role },
      });
    }
  }

  return NextResponse.json({ success: true });
}
