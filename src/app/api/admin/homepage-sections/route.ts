import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveHomepageSections, getHomepageSections } from "@/lib/public/section-manager";
import type { SectionConfig } from "@/lib/public/section-manager";

export async function GET() {
  const sections = await getHomepageSections();
  return NextResponse.json(sections);
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sections: SectionConfig[] = await req.json();
  await saveHomepageSections(sections);
  return NextResponse.json({ success: true });
}
