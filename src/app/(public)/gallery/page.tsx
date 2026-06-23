export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { GalleryGrid } from "@/components/public/gallery-grid";

export const metadata: Metadata = {
  title: "Gallery — Zipline Maldives",
  description: "Photos and videos from the zipline. 428 metres of stories told.",
};

async function getMedia() {
  try {
    return await prisma.websiteMedia.findMany({
      where: { active: true },
      orderBy: [{ category: { slug: "asc" } }, { displayOrder: "asc" }],
      include: { category: true },
    });
  } catch { return []; }
}

export default async function GalleryPage() {
  const media = await getMedia();

  return (
    <div className="pt-28 pb-20">
      <div className="container-brand">
        {/* Header */}
        <div className="text-center mb-14 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-turquoise/10 border border-brand-turquoise/20">
            <span className="text-brand-turquoise text-xs font-semibold tracking-wider uppercase">Gallery</span>
          </div>
          <h1 className="font-display font-bold text-5xl lg:text-6xl text-white leading-[1.05]">
            428 metres of<br />
            <span className="text-brand-citrus">stories told.</span>
          </h1>
          <p className="text-white/50 text-xl max-w-md mx-auto">
            Every ride is different. Every story is worth keeping.
          </p>
        </div>

        {media.length === 0 ? (
          <div className="text-center py-20 text-white/25 text-sm">
            Gallery coming soon. Upload media from the admin panel.
          </div>
        ) : (
          <GalleryGrid items={media} />
        )}
      </div>
    </div>
  );
}
