import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET() {
  const backgrounds = await prisma.websiteBackground.findMany({ orderBy: { pageKey: "asc" } });
  return NextResponse.json(backgrounds);
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { pageKey, sectionKey, ...rest } = body;

  const bg = await prisma.websiteBackground.upsert({
    where:  { pageKey_sectionKey: { pageKey, sectionKey: sectionKey ?? "" } },
    update: rest,
    create: { pageKey, sectionKey: sectionKey ?? "", ...rest },
  });

  return NextResponse.json(bg);
}
