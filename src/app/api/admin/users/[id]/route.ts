import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Prevent changing own role
  const requestingUser = await prisma.user.findUnique({ where: { supabaseUid: user.id } });
  if (requestingUser?.id === params.id && body.role) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 403 });
  }

  await prisma.user.update({ where: { id: params.id }, data: body });

  // Sync role to Supabase user metadata
  if (body.role) {
    const targetUser = await prisma.user.findUnique({ where: { id: params.id } });
    if (targetUser?.supabaseUid) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(targetUser.supabaseUid, {
        user_metadata: { role: body.role },
      });
    }
  }

  return NextResponse.json({ success: true });
}
