import { NextRequest, NextResponse } from "next/server";
import { saveHomepageSections, getHomepageSections } from "@/lib/public/section-manager";
import type { SectionConfig } from "@/lib/public/section-manager";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function GET() {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const sections = await getHomepageSections();
  return NextResponse.json(sections);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const sections: SectionConfig[] = await req.json();
  await saveHomepageSections(sections);
  return NextResponse.json({ success: true });
}
