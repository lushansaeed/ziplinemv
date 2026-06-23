import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    await prisma.setting.upsert({
      where:  { key },
      update: { value: value as any },
      create: { key, value: value as any, type: typeof value },
    });
  }

  return NextResponse.json({ success: true });
}
