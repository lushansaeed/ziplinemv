import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone } = await req.json();
  const dbUser = await prisma.user.findUnique({ where: { supabaseUid: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.user.update({ where: { id: dbUser.id }, data: { name } }),
    ...(phone ? [prisma.affiliate.update({ where: { userId: dbUser.id }, data: { phone } })] : []),
  ]);

  return NextResponse.json({ success: true });
}
