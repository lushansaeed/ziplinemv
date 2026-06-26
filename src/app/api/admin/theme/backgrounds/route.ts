import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function GET() {
  const auth = await requireApiPermission("settings", "view");
  if (!auth.ok) return auth.response;

  const backgrounds = await prisma.websiteBackground.findMany({ orderBy: { pageKey: "asc" } });
  return NextResponse.json(backgrounds);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { pageKey, sectionKey, ...rest } = body;

  const bg = await prisma.websiteBackground.upsert({
    where:  { pageKey_sectionKey: { pageKey, sectionKey: sectionKey ?? "" } },
    update: rest,
    create: { pageKey, sectionKey: sectionKey ?? "", ...rest },
  });

  return NextResponse.json(bg);
}
