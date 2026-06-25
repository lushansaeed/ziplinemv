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
import { CustomSection } from "@/components/public/home/custom-section";
import { PageBackground } from "@/components/public/page-background-server";
import { getPageTypography } from "@/lib/public/typography";
import { getAllSectionContent } from "@/lib/public/sections";
import { getHomepageSections } from "@/lib/public/section-manager";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zipline Maldives — Maldives' First Island-to-Island Zipline",
  description: "Drop in by zipline. Leave with a story. 428 metres of ocean, adrenaline, and unforgettable views from Maafushi to Vahmāfushi.",
};

async function getHomeData() {
  const [packages, addOns, heroMedia, galleryMedia, settings, typography, sections, sectionOrder] = await Promise.all([
    prisma.package.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" }, take: 3 }),
    prisma.addOn.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.websiteMedia.findFirst({ where: { active: true, frontendLocation: "hero" }, include: { category: true } }),
    prisma.websiteMedia.findMany({ where: { active: true, category: { slug: "gallery" } }, orderBy: { displayOrder: "asc" }, take: 9, include: { category: true } }),
    prisma.setting.findMany({ where: { key: { in: ["site_tagline","zipline_length_m","experience_duration_min","full_journey_min","min_rider_weight_kg","max_rider_weight_kg","min_rider_age"] } } }),
    getPageTypography("home"),
    getAllSectionContent(),
    getHomepageSections(),
  ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return { packages, addOns, heroMedia, galleryMedia, settingsMap, typography, sections, sectionOrder };
}

export default async function HomePage() {
  const { packages, addOns, heroMedia, galleryMedia, settingsMap, typography, sections, sectionOrder } = await getHomeData();

  // Render only visible sections in order
  const visibleSections = sectionOrder.filter((s) => s.visible);

  return (
    <>
      <PageBackground pageKey="home" />

      {visibleSections.map((cfg) => {
        switch (cfg.type) {
          case "hero":
            return (
              <div key={cfg.key}>
                <HeroSection heroMedia={heroMedia as any} typography={typography} />
                <TrustBar settings={settingsMap} />
              </div>
            );
          case "route":
            return <RouteSection key={cfg.key} content={sections.route} />;
          case "packages":
            return <PackagesPreview key={cfg.key} packages={packages as any} content={sections.packages} />;
          case "addons":
            return <AddOnsPreview key={cfg.key} addOns={addOns as any} content={sections.addons} />;
          case "gallery":
            return <GalleryWall key={cfg.key} items={galleryMedia as any} content={sections.gallery} />;
          case "story":
            return <StoryTeaser key={cfg.key} content={sections.story} />;
          case "custom": {
            const customContent = sections[cfg.key] ?? {
              badge: cfg.label, heading: "", subheading: "", description: "", mediaUrl: "", mediaType: "image" as const, fontSize: 48, rotation: 0,
            };
            return <CustomSection key={cfg.key} sectionKey={cfg.key} content={customContent as any} />;
          }
          default:
            return null;
        }
      })}

      <PartnersCTA />
    </>
  );
}
