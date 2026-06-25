import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const { category, question, answer, displayOrder } = await req.json();
  if (!category || !question || !answer) return NextResponse.json({ error: "Required fields missing" }, { status: 400 });

  const faq = await prisma.faq.create({ data: { category, question, answer, displayOrder: displayOrder ?? 0, active: true } });
  return NextResponse.json(faq, { status: 201 });
}
