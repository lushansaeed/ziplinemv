import type { Metadata } from "next";
import { prisma } from "@/lib/prisma/client";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateMarketing } from "@/components/affiliate/marketing/affiliate-marketing";

export const metadata: Metadata = { title: "Marketing Assets | Affiliate Portal" };

export default async function AffiliateMarketingPage() {
  await getApprovedAffiliate();

  const assets = await prisma.websiteMedia.findMany({
    where:   { active: true, frontendLocation: "affiliate-kit" },
    orderBy: { displayOrder: "asc" },
  });

  const copy = {
    headlines: [
      "Fly from Maafushi. Land in a story.",
      "Your barefoot adventure starts in the sky.",
      "428 metres of ocean, adrenaline, and unforgettable views.",
      "Drop in by zipline. Leave with a story.",
      "The Maldives, from a whole new angle.",
      "Maldives' first island-to-island zipline experience.",
    ],
    captions: [
      "Just tried the most insane thing in the Maldives 🔥 Zipline from one island to another — link in bio to book!",
      "428 metres of open ocean beneath your feet. No words needed. @ziplinemaldives",
      "If you're in Maafushi, THIS is a non-negotiable. Zipline Maldives is the move. Link to book in bio.",
    ],
    hashtags: "#ziplinemaldives #maldives #maafushi #adventure #zipline #maldiveslife #travelmaldives #islandlife",
  };

  return (
    <div>
      <PageHeader title="Marketing Assets" description="Copy, captions, and media for your content." />
      <AffiliateMarketing assets={assets} copy={copy} />
    </div>
  );
}
