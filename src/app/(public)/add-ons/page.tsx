import { PageBackground } from "@/components/public/page-background-server";
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Video, Tv2, ArrowRight, Clock, Star, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/public/page-heading";

export const metadata: Metadata = {
  title: "Media Add-ons — Zipline Maldives",
  description: "No phones allowed on the ride. Let our team capture every second — professional photography, 360° video, and drone footage.",
};

async function getAddOns() {
  return prisma.addOn.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
}

const ICONS = [Camera, Video, Tv2];
const COLORS = [
  { accent: "brand-coral",   glow: "rgba(255,107,107,0.15)", border: "border-brand-coral/25" },
  { accent: "brand-citrus",  glow: "rgba(245,166,35,0.15)",  border: "border-brand-citrus/25" },
  { accent: "brand-ocean",   glow: "rgba(14,165,233,0.15)",  border: "border-brand-ocean/25" },
];

export default async function AddOnsPage() {
  const addOns = await getAddOns();

  const displayAddOns = addOns.length > 0 ? addOns : [
    { id: "1", name: "Photography", description: "Professional high-resolution photos taken by our on-ground team. Delivered digitally within 24 hours.", price: 45, bestFor: "Couples & families", rules: "Delivered within 24 hours of your ride", currency: "USD", displayOrder: 1, active: true, activityId: "", mediaUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", name: "360° Video",  description: "Capture every angle of your flight. Immersive 360° video that puts you right back on the zipline. Great for social media and VR headsets.", price: 65, bestFor: "Content creators & thrill-seekers", rules: "Delivered within 48 hours. Compatible with all VR headsets.", currency: "USD", displayOrder: 2, active: true, activityId: "", mediaUrl: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "3", name: "Drone Footage",description: "Cinematic aerial footage of your entire journey — from launch to landing. Spectacular when the conditions are right.", price: 85, bestFor: "Everyone who wants the full picture", rules: "Subject to weather and airspace conditions. Delivered within 48h. Not guaranteed.", currency: "USD", displayOrder: 3, active: true, activityId: "", mediaUrl: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  return (
    <div className="pt-28 pb-20">
      <PageBackground pageKey="add-ons" />
      <div className="container-brand">
        {/* Hero header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-mango/10 border border-brand-mango/20">
            <span className="text-brand-mango text-xs font-semibold tracking-wider uppercase">Media Add-ons</span>
          </div>
          <PageHeading pageKey="add-ons" className="items-center" subClassName="mx-auto" />
        </div>

        {/* Important note */}
        <div className="flex items-start gap-3 site-card rounded-2xl p-5 max-w-2xl mx-auto mb-16">
          <AlertTriangle className="w-5 h-5 text-brand-citrus flex-shrink-0 mt-0.5" />
          <p className="site-body text-sm leading-relaxed">
            <strong className="site-heading">No personal devices allowed</strong> during the zipline ride for safety reasons.
            Add media to your booking and we'll capture it all. You can add these to any package.
          </p>
        </div>

        {/* Add-on cards */}
        <div className="mb-20 flex flex-wrap justify-center gap-8">
          {displayAddOns.map((addon, i) => {
            const Icon  = ICONS[i] ?? Camera;
            const color = COLORS[i] ?? COLORS[0];
            const isHighlighted = i === 1;

            return (
              <div
                key={addon.id}
                className={cn(
                  "relative w-full sm:flex-[0_1_360px] site-card rounded-2xl p-8 flex flex-col gap-6 transition-all duration-300 hover:-translate-y-1",
                  isHighlighted && "site-card-selected"
                )}
              >
                {isHighlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 bg-brand-gradient text-brand-deep text-xs font-bold px-4 py-1.5 rounded-full">
                      <Star className="w-3 h-3" />
                      Most popular
                    </span>
                  </div>
                )}

                {/* Media preview placeholder */}
                {addon.mediaUrl ? (
                  <div className="aspect-video rounded-xl overflow-hidden bg-white/4">
                    <video src={addon.mediaUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                  </div>
                ) : (
                  <div className={cn(
                    "aspect-video rounded-xl flex items-center justify-center border site-subtle-border",
                    "bg-white/60"
                  )}>
                    <Icon className={cn("w-12 h-12", `text-${color.accent}`)} style={{ opacity: 0.3 }} />
                  </div>
                )}

                <div className="space-y-3">
                  <div className={cn("w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center")}>
                    <Icon className={cn("w-5 h-5", `text-${color.accent}`)} />
                  </div>
                  <h2 className="font-display font-bold text-2xl site-heading">{addon.name}</h2>
                  <p className="site-text-muted leading-relaxed">{addon.description}</p>
                </div>

                {addon.bestFor && (
                  <div className="flex items-center gap-2 text-sm site-text-muted">
                    <span>Best for:</span>
                    {addon.bestFor}
                  </div>
                )}

                {addon.rules && (
                  <div className="flex items-start gap-2 text-xs site-text-muted">
                    <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {addon.rules}
                  </div>
                )}

                <div className="pt-5 border-t site-subtle-border flex items-center justify-between mt-auto">
                  <div>
                    <p className="site-text-muted text-xs">Add for</p>
                    <p className="font-display font-bold text-3xl site-accent">
                      +{formatCurrency(Number(addon.price), (addon as any).currency ?? "USD")}
                    </p>
                  </div>
                  <Link
                    href="/book"
                    className={cn(
                      "flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl border transition-all",
                      isHighlighted
                        ? "site-button border-transparent"
                        : "site-button-outline"
                    )}
                  >
                    Add to booking
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bundle callout */}
        <div className="site-card rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto">
          <h3 className="font-display font-bold text-2xl site-heading">Get them all with The Full Story</h3>
          <p className="site-text-muted text-sm leading-relaxed">
            Photography + 360° Video + Drone Footage bundled into one package. Save compared to adding individually.
          </p>
          <Link href="/packages" className="inline-flex items-center gap-2 site-accent font-semibold text-sm transition-colors group">
            View The Full Story package
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
