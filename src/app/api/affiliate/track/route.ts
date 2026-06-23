import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

// Called client-side when a ?ref= URL is detected on the public site
export async function POST(req: NextRequest) {
  try {
    const { slug, coupon, sessionId } = await req.json();

    const ip        = req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.ip ?? null;
    const userAgent = req.headers.get("user-agent") ?? null;
    const referrer  = req.headers.get("referer") ?? null;

    if (slug) {
      const link = await prisma.affiliateLink.findUnique({ where: { slug, active: true } });
      if (link) {
        await Promise.all([
          prisma.affiliateClick.create({
            data: { linkId: link.id, sessionId, ipAddress: ip, userAgent, referrer },
          }),
          prisma.affiliateLink.update({
            where: { id: link.id },
            data:  { clickCount: { increment: 1 } },
          }),
        ]);
      }
    }

    if (coupon) {
      const couponRecord = await prisma.affiliateCoupon.findFirst({
        where: { code: coupon.toUpperCase(), status: "APPROVED" },
      });
      if (couponRecord) {
        await prisma.affiliateClick.create({
          data: { couponId: couponRecord.id, sessionId, ipAddress: ip, userAgent, referrer },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    // Silently fail — click tracking should never break the user experience
    return NextResponse.json({ success: false });
  }
}
