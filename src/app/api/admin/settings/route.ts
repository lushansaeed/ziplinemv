import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

// Map known keys to their groups so settings are always fetchable by group
const KEY_GROUPS: Record<string, string> = {
  site_name:             "general",
  site_tagline:          "general",
  site_logo_url:         "general",
  site_logo_size:        "general",
  site_logo_text:        "general",
  hero_font_size:        "hero",
  hero_rotation:         "hero",
  agent_default_commission:     "agents",
  affiliate_default_commission: "affiliates",
  affiliate_cookie_days:        "affiliates",
  default_currency:      "pricing",
  booking_auto_confirm:  "booking",
  min_rider_weight_kg:   "safety",
  max_rider_weight_kg:   "safety",
  min_rider_age:         "safety",
};

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  for (const [key, value] of Object.entries(body)) {
    const group = KEY_GROUPS[key];
    await prisma.setting.upsert({
      where:  { key },
      update: { value: value as any, ...(group ? { group } : {}) },
      create: { key, value: value as any, type: typeof value, ...(group ? { group } : {}) },
    });
  }

  return NextResponse.json({ success: true });
}
