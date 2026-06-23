export const dynamic = "force-dynamic";

import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma/client";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://zipline.mv";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const packages = await prisma.package.findMany({
    where: { active: true },
    select: { slug: true, updatedAt: true },
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                              lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/packages`,                lastModified: new Date(), changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/add-ons`,                 lastModified: new Date(), changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/book`,                    lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 },
    { url: `${BASE}/our-story`,               lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/gallery`,                 lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/faq`,                     lastModified: new Date(), changeFrequency: "weekly",  priority: 0.7 },
    { url: `${BASE}/contact`,                 lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/terms`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/refund-policy`,           lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/important-information`,   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/agent-registration`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/affiliate-registration`,  lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  return staticPages;
}
