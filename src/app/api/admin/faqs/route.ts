import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const { category, question, answer, displayOrder } = await req.json();
  if (!category || !question || !answer) return NextResponse.json({ error: "Required fields missing" }, { status: 400 });

  const faq = await prisma.faq.create({ data: { category, question, answer, displayOrder: displayOrder ?? 0, active: true } });
  return NextResponse.json(faq, { status: 201 });
}
