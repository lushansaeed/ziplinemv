import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function GET() {
  const auth = await requireApiPermission("website_customization", "view");
  if (!auth.ok) return auth.response;

  const theme = await prisma.websiteTheme.findFirst({ where: { isActive: true } });
  const backgrounds = await prisma.websiteBackground.findMany({ where: { isActive: true } });
  const presets = await prisma.themePreset.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ theme, backgrounds, presets });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission("website_customization", "publish");
  if (!auth.ok) return auth.response;

  const body = await req.json();

  // Upsert the active theme
  const existing = await prisma.websiteTheme.findFirst({ where: { isActive: true } });
  let theme;
  if (existing) {
    theme = await prisma.websiteTheme.update({ where: { id: existing.id }, data: body });
  } else {
    theme = await prisma.websiteTheme.create({ data: { ...body, isActive: true } });
  }

  revalidatePath("/", "layout");

  return NextResponse.json(theme);
}
