import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const theme = await prisma.websiteTheme.findFirst({ where: { isActive: true } });
  const backgrounds = await prisma.websiteBackground.findMany({ where: { isActive: true } });
  const presets = await prisma.themePreset.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ theme, backgrounds, presets });
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Upsert the active theme
  const existing = await prisma.websiteTheme.findFirst({ where: { isActive: true } });
  let theme;
  if (existing) {
    theme = await prisma.websiteTheme.update({ where: { id: existing.id }, data: body });
  } else {
    theme = await prisma.websiteTheme.create({ data: { ...body, isActive: true } });
  }

  return NextResponse.json(theme);
}
