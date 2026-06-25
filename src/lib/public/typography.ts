import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";

export interface PageTypography {
  heading:      string;
  subheading:   string;
  fontSize:     number;   // px
  rotation:     number;   // degrees
}

const PAGE_DEFAULTS: Record<string, PageTypography> = {
  home:       { heading: "Fly from Maafushi. Land in a story.",       subheading: "428 metres of ocean, adrenaline, and unforgettable views.\nYour barefoot adventure starts in the sky.",                   fontSize: 82, rotation: 0 },
  packages:   { heading: "The ride.\nChoose yours.",                  subheading: "Three ways to fly. One unforgettable route.",                                                                               fontSize: 64, rotation: 0 },
  "add-ons":  { heading: "Add the shot.\nKeep the memory.",           subheading: "Personal phones and cameras aren't allowed on the zipline.\nThat's why we have professionals doing it for you.",          fontSize: 64, rotation: 0 },
  gallery:    { heading: "428 metres of\nstories told.",              subheading: "Every ride is different. Every story is worth keeping.",                                                                    fontSize: 64, rotation: 0 },
  "our-story":{ heading: "Born from the\nocean.",                     subheading: "Vahmāfushi is the island of elevated experiences.\nJust a zipline away from Maafushi.",                                   fontSize: 64, rotation: 0 },
  faq:        { heading: "Everything you\nneed to know.",             subheading: "From booking to boarding — all your questions answered.",                                                                   fontSize: 64, rotation: 0 },
  contact:    { heading: "Come find us.",                             subheading: "We're on Maafushi Island. Drop in — or reach out before your ride.",                                                       fontSize: 64, rotation: 0 },
  book:       { heading: "Book your flight.",                         subheading: "Maafushi → Vahmāfushi · 428m · ~60 seconds",                                                                              fontSize: 64, rotation: 0 },
};

export async function getPageTypography(pageKey: string): Promise<PageTypography> {
  noStore();
  const defaults = PAGE_DEFAULTS[pageKey] ?? PAGE_DEFAULTS.home;

  try {
    const keys = [
      `page_${pageKey}_heading`,
      `page_${pageKey}_subheading`,
      `page_${pageKey}_font_size`,
      `page_${pageKey}_rotation`,
    ];
    const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const get = (k: string) => settings.find((s) => s.key === k)?.value;

    return {
      heading:    (get(`page_${pageKey}_heading`)    as string) || defaults.heading,
      subheading: (get(`page_${pageKey}_subheading`) as string) || defaults.subheading,
      fontSize:   Number(get(`page_${pageKey}_font_size`))     || defaults.fontSize,
      rotation:   Number(get(`page_${pageKey}_rotation`))      || defaults.rotation,
    };
  } catch {
    return defaults;
  }
}

export function getAllPageDefaults() {
  return PAGE_DEFAULTS;
}
