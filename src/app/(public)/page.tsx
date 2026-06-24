import { PageBackground } from "@/components/public/page-background-server";
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma/client";
import { HeroSection } from "@/components/public/home/hero-section";
import { TrustBar } from "@/components/public/home/trust-bar";
import { RouteSection } from "@/components/public/home/route-section";
import { PackagesPreview } from "@/components/public/home/packages-preview";
import { AddOnsPreview } from "@/components/public/home/addons-preview";
import { GalleryWall } from "@/components/public/home/gallery-wall";
import { StoryTeaser } from "@/components/public/home/story-teaser";
import { PartnersCTA } from "@/components/public/home/partners-cta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zipline Maldives — Maldives' First Island-to-Island Zipline",
  description: "Drop in by zipline. Leave with a story. 428 metres of ocean, adrenaline, and unforgettable views from Maafushi to Vahmāfushi.",
};

async function getHomeData() {
  const [packages, addOns, heroMedia, galleryMedia, settings] = await Promise.all([
    prisma.package.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      take: 3,
    }),
    prisma.addOn.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.websiteMedia.findFirst({
      where: { active: true, frontendLocation: "hero" },
      include: { category: true },
    }),
    prisma.websiteMedia.findMany({
      where: { active: true, category: { slug: "gallery" } },
      orderBy: { displayOrder: "asc" },
      take: 9,
      include: { category: true },
    }),
    prisma.setting.findMany({
      where: { key: { in: ["site_tagline", "zipline_length_m", "experience_duration_min", "full_journey_min", "min_rider_weight_kg", "max_rider_weight_kg", "min_rider_age"] } },
    }),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return { packages, addOns, heroMedia, galleryMedia, settingsMap };
}

export default async function HomePage() {
  const { packages, addOns, heroMedia, galleryMedia, settingsMap } = await getHomeData();

  return (
    <>
      <PageBackground pageKey="home" />
      <HeroSection heroMedia={heroMedia} />
      <TrustBar settings={settingsMap} />
      <RouteSection />
      <PackagesPreview packages={packages} />
      <AddOnsPreview addOns={addOns} />
      <GalleryWall items={galleryMedia} />
      <StoryTeaser />
      <PartnersCTA />
    </>
  );
}
