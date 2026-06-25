import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const { text, ctaLabel, ctaUrl, active } = await req.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: { text, ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null, active: active ?? true },
  });
  return NextResponse.json(announcement, { status: 201 });
}
