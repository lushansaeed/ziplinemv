import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

async function getAffiliate(userId: string) {
  return prisma.affiliate.findUnique({ where: { userId }, select: { id: true } });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseUid: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const affiliate = await getAffiliate(dbUser.id);
  if (!affiliate) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

  const { label } = await req.json();
  const slug      = `${dbUser.id.slice(0, 6)}-${Date.now().toString(36)}`;
  const siteUrl   = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zipline.mv";

  const link = await prisma.affiliateLink.create({
    data: {
      affiliateId: affiliate.id,
      slug,
      fullUrl:     `${siteUrl}/?ref=${slug}`,
      label:       label || null,
      active:      true,
    },
  });

  return NextResponse.json({ ...link, _count: { clicks: 0 } }, { status: 201 });
}
