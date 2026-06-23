import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function ownsLink(supabaseUid: string, linkId: string) {
  const user      = await prisma.user.findUnique({ where: { supabaseUid }, select: { id: true } });
  const affiliate = await prisma.affiliate.findUnique({ where: { userId: user?.id }, select: { id: true } });
  const link      = await prisma.affiliateLink.findFirst({ where: { id: linkId, affiliateId: affiliate?.id } });
  return !!link;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownsLink(user.id, params.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const link = await prisma.affiliateLink.update({ where: { id: params.id }, data: body });
  return NextResponse.json(link);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await ownsLink(user.id, params.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.affiliateLink.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
