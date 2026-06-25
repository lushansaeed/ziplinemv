import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";

export interface SectionContent {
  badge:       string;
  heading:     string;   // \n for line breaks, second line gets accent colour
  description: string;
  mediaUrl:    string;
  mediaType:   "image" | "video";
}

export const SECTION_DEFAULTS: Record<string, SectionContent> = {
  route: {
    badge:       "The route",
    heading:     "The Maldives,\nfrom a whole\nnew angle.",
    description: "Launch from Maafushi Island and fly 428 metres across open ocean to Vahmāfushi — Maldives' first island-to-island zipline experience. Your return by speedboat is included.",
    mediaUrl:    "",
    mediaType:   "image",
  },
  packages: {
    badge:       "Packages",
    heading:     "Book the ride.\nChoose your vibe.",
    description: "Every package includes the full zipline experience and speedboat return.",
    mediaUrl:    "",
    mediaType:   "image",
  },
  addons: {
    badge:       "Media add-ons",
    heading:     "Add the shot.\nKeep the memory.",
    description: "No phones allowed on the ride. Our team captures every second instead.",
    mediaUrl:    "",
    mediaType:   "image",
  },
  gallery: {
    badge:       "Gallery",
    heading:     "428 metres of\nstories told.",
    description: "Every ride is different. Every story is worth keeping.",
    mediaUrl:    "",
    mediaType:   "image",
  },
  story: {
    badge:       "Our story",
    heading:     "Vahmāfushi is the island\nof elevated experiences.",
    description: "Just a zipline away from Maafushi, Vahmāfushi was built to be different. An island where adventure, freedom, and the pure joy of movement come together — above the Indian Ocean.",
    mediaUrl:    "",
    mediaType:   "image",
  },
};

export async function getAllSectionContent(): Promise<Record<string, SectionContent>> {
  noStore();
  try {
    const sectionKeys = Object.keys(SECTION_DEFAULTS);
    const fields = ["badge","heading","description","media_url","media_type"];
    const dbKeys = sectionKeys.flatMap((s) => fields.map((f) => `section_${s}_${f}`));

    const settings = await prisma.setting.findMany({
      where: { key: { in: dbKeys } },
    });

    const result: Record<string, SectionContent> = {};
    for (const key of sectionKeys) {
      const get = (field: string) => {
        const s = settings.find((x) => x.key === `section_${key}_${field}`);
        return s ? String(s.value) : "";
      };
      const defaults = SECTION_DEFAULTS[key];
      result[key] = {
        badge:       get("badge")       || defaults.badge,
        heading:     get("heading")     || defaults.heading,
        description: get("description") || defaults.description,
        mediaUrl:    get("media_url")   || defaults.mediaUrl,
        mediaType:   (get("media_type") || defaults.mediaType) as "image" | "video",
      };
    }
    return result;
  } catch {
    return { ...SECTION_DEFAULTS };
  }
}

export async function getSectionContent(sectionKey: string): Promise<SectionContent> {
  const all = await getAllSectionContent();
  return all[sectionKey] ?? SECTION_DEFAULTS[sectionKey] ?? SECTION_DEFAULTS.route;
}
