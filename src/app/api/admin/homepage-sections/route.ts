import { NextRequest, NextResponse } from "next/server";
import { saveHomepageSections, getHomepageSections } from "@/lib/public/section-manager";
import type { SectionConfig } from "@/lib/public/section-manager";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function GET() {
  const auth = await requireApiPermission("website_customization", "view");
  if (!auth.ok) return auth.response;

  const sections = await getHomepageSections();
  return NextResponse.json(sections);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiPermission("website_customization", "update");
  if (!auth.ok) return auth.response;

  const sections: SectionConfig[] = await req.json();
  await saveHomepageSections(sections);
  return NextResponse.json({ success: true });
}
