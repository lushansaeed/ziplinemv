import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
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
