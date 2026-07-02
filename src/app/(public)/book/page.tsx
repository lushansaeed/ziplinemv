import { PageBackground } from "@/components/public/page-background-server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { getPublicOperatingHours } from "@/lib/public/operating-hours";

export const metadata: Metadata = {
  title: "Book Your Flight — Zipline Maldives",
  description: "Book your zipline experience. Choose your date, package, and add-ons in minutes.",
};

async function getBookingData(packageSlug?: string) {
  try {
    const [packages, addOns, operatingHours] = await Promise.all([
      prisma.package.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
      prisma.addOn.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
      getPublicOperatingHours(),
    ]);
    const preselectedPackage = packageSlug
      ? packages.find((p) => p.slug === packageSlug) ?? null
      : null;
    return { packages, addOns, preselectedPackage, operatingHours };
  } catch {
    return {
      packages: [],
      addOns: [],
      preselectedPackage: null,
      operatingHours: { summary: "Open daily 08:00 – 17:00", openDays: [0, 1, 2, 3, 4, 5, 6] },
    };
  }
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: { package?: string; date?: string; ref?: string; coupon?: string };
}) {
  const { packages, addOns, preselectedPackage, operatingHours } = await getBookingData(searchParams.package);

  return (
    <div className="min-h-screen pt-20 pb-28 lg:pb-10">
      <PageBackground pageKey="book" />
      <BookingWizard
        packages={packages as any}
        addOns={addOns as any}
        preselectedPackageId={preselectedPackage?.id}
        initialDate={searchParams.date}
        affiliateRef={searchParams.ref}
        affiliateCoupon={searchParams.coupon}
        operatingHoursLabel={operatingHours.summary}
        openDays={operatingHours.openDays}
      />
    </div>
  );
}
