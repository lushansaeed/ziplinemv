import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const { text, ctaLabel, ctaUrl, active } = await req.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: { text, ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null, active: active ?? true },
  });
  return NextResponse.json(announcement, { status: 201 });
}
