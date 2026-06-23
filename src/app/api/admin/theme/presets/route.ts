import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const presets = await prisma.themePreset.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const preset = await prisma.themePreset.create({ data: body });
  return NextResponse.json(preset, { status: 201 });
}
