import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requireApiPermission } from "@/lib/auth/permissions";

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
  const auth = await requireApiPermission("settings", "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const old = await prisma.setting.findMany({ where: { key: { in: Object.keys(body) } } });

  for (const [key, value] of Object.entries(body)) {
    const group = KEY_GROUPS[key];
    await prisma.setting.upsert({
      where:  { key },
      update: { value: value as any, ...(group ? { group } : {}) },
      create: { key, value: value as any, type: typeof value, ...(group ? { group } : {}) },
    });
  }

  await logAudit({ userId: auth.dbUser.id, action: "SETTINGS_UPDATED", module: "settings", oldValue: old, newValue: body });

  return NextResponse.json({ success: true });
}
