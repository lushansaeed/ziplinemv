"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma/client";
import { requireRole } from "@/lib/auth/actions";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";
import { ApplicationStatus, UserStatus } from "@prisma/client";

export async function approveAffiliate(applicationId: string) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);

  const application = await prisma.affiliateApplication.findUnique({ where: { id: applicationId } });
  if (!application) return { success: false, error: "Application not found" };

  const user = await prisma.user.findUnique({ where: { email: application.email } });
  if (!user) return { success: false, error: "User account not found" };

  const affiliate = await prisma.affiliate.upsert({
    where:  { userId: user.id },
    update: { status: ApplicationStatus.APPROVED, approvedAt: new Date() },
    create: {
      userId:          user.id,
      applicationId,
      name:            application.name,
      contactPerson:   application.contactPerson,
      email:           application.email,
      phone:           application.phone,
      website:         application.website,
      channel:         application.promotionChannel,
      commissionRate:  5,
      status:          ApplicationStatus.APPROVED,
      approvedAt:      new Date(),
    },
  });

  // Create default referral link
  const slug = `${application.name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now().toString(36)}`;
  await prisma.affiliateLink.upsert({
    where:  { slug },
    update: {},
    create: {
      affiliateId: affiliate.id,
      slug,
      fullUrl:     `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://zipline.mv"}/?ref=${slug}`,
      label:       "Default link",
      active:      true,
    },
  });

  // Approve preferred coupon if requested
  if (application.preferredCoupon) {
    await prisma.affiliateCoupon.upsert({
      where:  { code: application.preferredCoupon },
      update: { status: ApplicationStatus.APPROVED, approvedAt: new Date() },
      create: {
        affiliateId:   affiliate.id,
        code:          application.preferredCoupon,
        discountType:  "PERCENTAGE",
        discountValue: 0,
        status:        ApplicationStatus.APPROVED,
        approvedAt:    new Date(),
      },
    });
  }

  await prisma.$transaction([
    prisma.affiliateApplication.update({
      where: { id: applicationId },
      data:  { status: ApplicationStatus.APPROVED, reviewedAt: new Date() },
    }),
    prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.ACTIVE } }),
    prisma.auditLog.create({
      data: { userId: admin.id, action: "AFFILIATE_APPROVED", module: "affiliates", recordId: applicationId },
    }),
  ]);

  revalidatePath("/admin/affiliates");
  return { success: true };
}

export async function rejectAffiliate(applicationId: string, reason?: string) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);
  await prisma.affiliateApplication.update({
    where: { id: applicationId },
    data:  { status: ApplicationStatus.REJECTED, adminNotes: reason, reviewedAt: new Date() },
  });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "AFFILIATE_REJECTED", module: "affiliates", recordId: applicationId } });
  revalidatePath("/admin/affiliates");
  return { success: true };
}

export async function approveCoupon(couponId: string) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);
  await prisma.affiliateCoupon.update({
    where: { id: couponId },
    data:  { status: ApplicationStatus.APPROVED, approvedAt: new Date() },
  });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "COUPON_APPROVED", module: "affiliates", recordId: couponId } });
  revalidatePath("/admin/affiliates");
  return { success: true };
}

export async function updateAffiliateCommission(affiliateId: string, rate: number) {
  const admin = await requireRole(ADMIN_AND_ABOVE as any);
  await prisma.affiliate.update({ where: { id: affiliateId }, data: { commissionRate: rate } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "AFFILIATE_COMMISSION_UPDATED", module: "affiliates", recordId: affiliateId, newValue: { rate } } });
  revalidatePath("/admin/affiliates");
  return { success: true };
}
