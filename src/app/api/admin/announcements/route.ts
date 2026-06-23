import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, ctaLabel, ctaUrl, active } = await req.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: { text, ctaLabel: ctaLabel || null, ctaUrl: ctaUrl || null, active: active ?? true },
  });
  return NextResponse.json(announcement, { status: 201 });
}
