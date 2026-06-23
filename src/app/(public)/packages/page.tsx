export const dynamic = "force-dynamic";

import { PageBackground } from "@/components/public/page-background";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, X, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Packages — Zipline Maldives",
  description: "Choose your zipline package. Classic flight, adventure pack, or the full story. Every package includes the return speedboat from Vahmāfushi.",
};

async function getPackages() {
  return prisma.package.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}

export default async function PackagesPage() {
  const packages = await getPackages();

  // Fallback data if no packages in DB yet
  const displayPackages = packages.length > 0 ? packages : [
    {
      id: "1", slug: "classic-flight", name: "The Classic Flight", featured: false,
      description: "The full zipline experience. Fly from Maafushi to Vahmāfushi, soak it all in, and return by speedboat. 428 metres of pure adrenaline.",
      touristPrice: 75, localPrice: 45, childPrice: null, currency: "USD",
      included: ["Single zipline ride (428m)", "Safety briefing & equipment", "Return speedboat transfer", "Zipline certificate"],
      excluded: ["Media add-ons", "Food & beverages"],
      packageTerms: null, maxParticipants: 8, imageUrl: null, videoUrl: null,
      agentCommissionEligible: true, affiliateCommissionEligible: true, displayOrder: 1, active: true,
      activityId: "", createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: "2", slug: "adventure-pack", name: "The Adventure Pack", featured: true,
      description: "Fly, capture, and relive. Includes the full zipline ride plus our professional photography add-on so you never lose the moment.",
      touristPrice: 120, localPrice: 75, childPrice: null, currency: "USD",
      included: ["Single zipline ride (428m)", "Safety briefing & equipment", "Return speedboat transfer", "Professional photography", "Digital delivery within 24h"],
      excluded: ["360° video", "Drone footage"],
      packageTerms: null, maxParticipants: 8, imageUrl: null, videoUrl: null,
      agentCommissionEligible: true, affiliateCommissionEligible: true, displayOrder: 2, active: true,
      activityId: "", createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: "3", slug: "full-story", name: "The Full Story", featured: false,
      description: "The ultimate Zipline Maldives experience. Every angle. Every second. Photography, 360° video, and drone footage — the complete story.",
      touristPrice: 195, localPrice: 120, childPrice: null, currency: "USD",
      included: ["Single zipline ride (428m)", "Safety briefing & equipment", "Return speedboat transfer", "Professional photography", "360° video", "Drone footage", "Digital delivery within 48h"],
      excluded: [],
      packageTerms: null, maxParticipants: 8, imageUrl: null, videoUrl: null,
      agentCommissionEligible: true, affiliateCommissionEligible: true, displayOrder: 3, active: true,
      activityId: "", createdAt: new Date(), updatedAt: new Date(),
    },
  ];

  return (
    <PageBackground pageKey="packages" className="pt-28 pb-20">
      <div className="container-brand">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-citrus/10 border border-brand-citrus/20">
            <span className="text-brand-citrus text-xs font-semibold tracking-wider uppercase">Packages</span>
          </div>
          <h1 className="font-display font-bold text-5xl lg:text-6xl text-white leading-[1.05]">
            Book the ride.<br />
            <span className="text-brand-citrus">Choose your vibe.</span>
          </h1>
          <p className="text-white/55 text-xl max-w-2xl mx-auto leading-relaxed">
            Every package starts with the same 428-metre flight over the Indian Ocean.
            What you capture is up to you.
          </p>
        </div>

        {/* Included in all packages */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 mb-14 max-w-2xl mx-auto">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-4 text-center">Included in every package</p>
          <div className="grid grid-cols-2 gap-3">
            {["Full 428m zipline ride", "Professional safety briefing", "All safety equipment", "Return speedboat to Maafushi", "Minimum age 6 years", "Weight 35–110 kg"].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-white/70">
                <Check className="w-3.5 h-3.5 text-brand-lime flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Package cards */}
        <div className="grid lg:grid-cols-3 gap-8">
          {displayPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "flex flex-col rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1",
                pkg.featured
                  ? "border-brand-citrus/40 shadow-[0_0_60px_rgba(245,166,35,0.1)]"
                  : "border-white/10"
              )}
            >
              {/* Image header */}
              <div className="relative h-48 overflow-hidden">
                {pkg.imageUrl ? (
                  <img src={pkg.imageUrl} alt={pkg.name} className="w-full h-full object-cover" />
                ) : (
                  <div className={cn(
                    "w-full h-full bg-gradient-to-br",
                    pkg.featured
                      ? "from-brand-citrus/20 via-brand-mango/10 to-transparent"
                      : "from-brand-ocean/15 to-transparent"
                  )}>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                      <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                        <path d="M3 17L12 3L21 17" stroke={pkg.featured ? "#F5A623" : "#38bdf8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                )}
                {pkg.featured && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-brand-gradient text-brand-deep text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-deep to-transparent" />
              </div>

              <div className="flex flex-col flex-1 p-7 space-y-5">
                <div>
                  <h2 className="font-display font-bold text-2xl text-white">{pkg.name}</h2>
                  <p className="text-white/55 text-sm mt-2 leading-relaxed">{pkg.description}</p>
                </div>

                {/* Included */}
                {pkg.included.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">What's included</p>
                    {pkg.included.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-white/75">
                        <Check className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", pkg.featured ? "text-brand-citrus" : "text-brand-lime")} />
                        {item}
                      </div>
                    ))}
                  </div>
                )}

                {/* Excluded */}
                {pkg.excluded.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Not included</p>
                    {pkg.excluded.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-white/40">
                        <X className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-white/25" />
                        {item}
                      </div>
                    ))}
                  </div>
                )}

                {/* Price + CTA */}
                <div className="pt-4 border-t border-white/8 mt-auto">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <p className="text-white/40 text-xs">Tourist price from</p>
                      <p className="font-display font-bold text-3xl text-white">
                        {formatCurrency(Number(pkg.touristPrice), pkg.currency)}
                      </p>
                      {pkg.localPrice && (
                        <p className="text-white/35 text-xs mt-0.5">
                          Maldivian residents: {formatCurrency(Number(pkg.localPrice), pkg.currency)}
                        </p>
                      )}
                    </div>
                    <p className="text-white/30 text-xs">per person</p>
                  </div>
                  <Link
                    href={`/book?package=${pkg.slug}`}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all duration-200",
                      pkg.featured
                        ? "bg-brand-gradient text-white shadow-brand-md hover:shadow-brand-lg"
                        : "border border-white/15 text-white hover:bg-white/8"
                    )}
                  >
                    Book this package
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custom / group note */}
        <div className="mt-16 text-center bg-white/3 rounded-2xl border border-white/8 p-8 max-w-xl mx-auto space-y-3">
          <p className="text-white font-semibold">Need something custom?</p>
          <p className="text-white/50 text-sm">
            Group bookings, corporate events, or special occasions — we'll work with you.
          </p>
          <Link href="/contact" className="inline-flex items-center gap-2 text-brand-citrus hover:text-brand-mango font-semibold text-sm transition-colors group">
            Get in touch
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </PageBackground>
  );
}
