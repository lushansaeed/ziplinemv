import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { nanoid } from "nanoid";

export interface SectionConfig {
  key:     string;   // unique identifier
  label:   string;   // display name in admin
  visible: boolean;
  order:   number;
  type:    "hero" | "route" | "packages" | "addons" | "gallery" | "story" | "custom";
}

export const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: "hero",     label: "Hero",       visible: true, order: 1, type: "hero" },
  { key: "route",    label: "Route",      visible: true, order: 2, type: "route" },
  { key: "packages", label: "Packages",   visible: true, order: 3, type: "packages" },
  { key: "addons",   label: "Add-ons",    visible: true, order: 4, type: "addons" },
  { key: "gallery",  label: "Gallery",    visible: true, order: 5, type: "gallery" },
  { key: "story",    label: "Our Story",  visible: true, order: 6, type: "story" },
];

export async function getHomepageSections(): Promise<SectionConfig[]> {
  noStore();
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "homepage_sections" },
    });
    if (!setting) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(setting.value as string) as SectionConfig[];
    return parsed.sort((a, b) => a.order - b.order);
  } catch {
    return DEFAULT_SECTIONS;
  }
}

export async function saveHomepageSections(sections: SectionConfig[]): Promise<void> {
  const ordered = sections.map((s, i) => ({ ...s, order: i + 1 }));
  await prisma.setting.upsert({
    where:  { key: "homepage_sections" },
    update: { value: JSON.stringify(ordered) },
    create: { key: "homepage_sections", value: JSON.stringify(ordered), type: "json", group: "homepage", label: "Homepage section order and visibility" },
  });
}

export function newCustomSection(): SectionConfig {
  return {
    key:     `custom_${nanoid(6)}`,
    label:   "New section",
    visible: true,
    order:   999,
    type:    "custom",
  };
}
