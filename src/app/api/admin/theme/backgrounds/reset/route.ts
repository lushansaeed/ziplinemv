import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageKey } = await req.json();
  if (!pageKey) return NextResponse.json({ error: "pageKey required" }, { status: 400 });

  await prisma.websiteBackground.updateMany({
    where: { pageKey },
    data:  { isActive: false },
  });

  return NextResponse.json({ success: true });
}
