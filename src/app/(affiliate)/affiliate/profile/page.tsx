import type { Metadata } from "next";
import { getApprovedAffiliate } from "@/lib/affiliate/helpers";
import { PageHeader } from "@/components/shared/page-header";
import { AffiliateProfile } from "@/components/affiliate/profile/affiliate-profile";

export const metadata: Metadata = { title: "Profile | Affiliate Portal" };

export default async function AffiliateProfilePage() {
  const { user, affiliate } = await getApprovedAffiliate();
  return (
    <div>
      <PageHeader title="Profile" description="Your affiliate account details." />
      <AffiliateProfile user={user} affiliate={affiliate} />
    </div>
  );
}
