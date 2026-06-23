import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // If activating a preset, apply its config to the active theme
  if (body.activate) {
    const preset = await prisma.themePreset.findUnique({ where: { id: params.id } });
    if (preset?.config) {
      const existing = await prisma.websiteTheme.findFirst({ where: { isActive: true } });
      if (existing) {
        await prisma.websiteTheme.update({ where: { id: existing.id }, data: preset.config as any });
      }
    }
    return NextResponse.json({ success: true });
  }

  const preset = await prisma.themePreset.update({ where: { id: params.id }, data: body });
  return NextResponse.json(preset);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const preset = await prisma.themePreset.findUnique({ where: { id: params.id }, select: { isDefault: true } });
  if (preset?.isDefault) return NextResponse.json({ error: "Cannot delete default presets" }, { status: 409 });

  await prisma.themePreset.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
