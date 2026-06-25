import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function requireApiRole(allowedRoles: UserRole[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUid: user.id },
    select: {
      id: true,
      supabaseUid: true,
      email: true,
      name: true,
      role: true,
      status: true,
    },
  });

  if (!dbUser || dbUser.status !== "ACTIVE" || !allowedRoles.includes(dbUser.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const, user, dbUser };
}
