import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function GET() {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const backgrounds = await prisma.websiteBackground.findMany({ orderBy: { pageKey: "asc" } });
  return NextResponse.json(backgrounds);
}

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
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
