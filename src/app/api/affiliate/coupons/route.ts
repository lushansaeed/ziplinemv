import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser    = await prisma.user.findUnique({ where: { supabaseUid: user.id } });
  const affiliate = await prisma.affiliate.findUnique({ where: { userId: dbUser?.id } });
  if (!affiliate) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

  const { code, discountType, discountValue } = await req.json();

  // Check uniqueness
  const existing = await prisma.affiliateCoupon.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) return NextResponse.json({ error: "This code is already taken. Please try another." }, { status: 409 });

  // Check approval required setting
  const approvalSetting = await prisma.setting.findUnique({ where: { key: "affiliate_coupon_approval_required" } });
  const needsApproval   = approvalSetting?.value !== false;

  const coupon = await prisma.affiliateCoupon.create({
    data: {
      affiliateId:   affiliate.id,
      code:          code.toUpperCase(),
      discountType,
      discountValue: parseFloat(discountValue),
      status:        needsApproval ? "PENDING" : "APPROVED",
      ...(needsApproval ? {} : { approvedAt: new Date() }),
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
