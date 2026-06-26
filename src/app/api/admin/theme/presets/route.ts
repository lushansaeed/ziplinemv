import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function GET() {
  const auth = await requireApiPermission("settings", "view");
  if (!auth.ok) return auth.response;

  const presets = await prisma.themePreset.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(presets);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const preset = await prisma.themePreset.create({ data: body });
  return NextResponse.json(preset, { status: 201 });
}
