import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const { pageKey } = await req.json();
  if (!pageKey) return NextResponse.json({ error: "pageKey required" }, { status: 400 });

  await prisma.websiteBackground.updateMany({
    where: { pageKey },
    data:  { isActive: false },
  });

  return NextResponse.json({ success: true });
}
