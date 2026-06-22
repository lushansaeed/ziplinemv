import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams({ section: "affiliates" });
  if (params.message) target.set("message", params.message);
  if (params.error) target.set("error", params.error);

  redirect(`/admin/bookings?${target.toString()}`);
}
