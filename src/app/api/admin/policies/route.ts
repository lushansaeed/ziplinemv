import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const { type, content } = await req.json();
  if (!type || !content) return NextResponse.json({ error: "type and content required" }, { status: 400 });

  await prisma.policy.upsert({
    where:  { type },
    update: { content },
    create: { type, content },
  });

  return NextResponse.json({ success: true });
}
