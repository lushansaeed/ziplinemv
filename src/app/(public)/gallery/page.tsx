import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Gallery — Zipline Maldives",
  description: "Photos and videos from the zipline. 428 metres of stories told.",
};

async function getMedia() {
  return prisma.websiteMedia.findMany({
    where: { active: true },
    orderBy: [{ category: { slug: "asc" } }, { displayOrder: "asc" }],
    include: { category: true },
  });
}

const SPAN_PATTERN = [
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
];

const PLACEHOLDER_GRADIENTS = [
  "from-brand-turquoise/25 via-brand-ocean/10 to-transparent",
  "from-brand-citrus/20 to-brand-mango/8",
  "from-brand-lime/20 to-transparent",
  "from-brand-coral/20 to-transparent",
  "from-brand-ocean/25 to-transparent",
  "from-brand-mango/20 to-transparent",
  "from-brand-turquoise/15 to-transparent",
  "from-brand-citrus/15 to-transparent",
  "from-brand-lime/15 to-transparent",
  "from-brand-coral/15 to-transparent",
  "from-brand-ocean/20 to-transparent",
  "from-brand-mango/15 to-transparent",
];

export default async function GalleryPage() {
  const media = await getMedia();
  const displayMedia = media.length > 0 ? media : Array(12).fill(null);

  // Group by category
  const categories = media.length > 0
    ? Array.from(new Set(media.map((m) => m.category?.name ?? "Gallery")))
    : ["Gallery"];

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

        {/* Masonry grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[110px] sm:auto-rows-[130px] gap-3">
          {displayMedia.slice(0, 12).map((item, i) => (
            <div
              key={(item as any)?.id ?? i}
              className={cn(
                "relative rounded-xl overflow-hidden group cursor-pointer",
                SPAN_PATTERN[i % SPAN_PATTERN.length]
              )}
            >
              {(item as any)?.url ? (
                (item as any).type === "VIDEO" ? (
                  <video
                    src={(item as any).url}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    muted loop autoPlay playsInline
                  />
                ) : (
                  <img
                    src={(item as any).url}
                    alt={(item as any).altText ?? (item as any).title ?? "Gallery"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                )
              ) : (
                <div className={cn("w-full h-full bg-gradient-to-br", PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length])} />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300" />
              {(item as any)?.caption && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-xs">{(item as any).caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {displayMedia.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">
            Gallery coming soon. Upload media from the admin panel.
          </div>
        )}
      </div>
    </div>
  );
}
