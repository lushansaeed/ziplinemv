import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { category, question, answer, displayOrder } = await req.json();
  if (!category || !question || !answer) return NextResponse.json({ error: "Required fields missing" }, { status: 400 });

  const faq = await prisma.faq.create({ data: { category, question, answer, displayOrder: displayOrder ?? 0, active: true } });
  return NextResponse.json(faq, { status: 201 });
}
