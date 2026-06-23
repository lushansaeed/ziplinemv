import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, content } = await req.json();
  if (!type || !content) return NextResponse.json({ error: "type and content required" }, { status: 400 });

  await prisma.policy.upsert({
    where:  { type },
    update: { content },
    create: { type, content },
  });

  return NextResponse.json({ success: true });
}
