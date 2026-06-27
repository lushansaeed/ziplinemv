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
  payment_card_enabled: "payments",
  payment_bank_transfer_enabled: "payments",
  payment_cash_enabled: "payments",
  payment_link_enabled: "payments",
  payment_bank_account_name: "payments",
  payment_mvr_account: "payments",
  payment_usd_account: "payments",
  booking_auto_confirm:  "booking",
  min_rider_weight_kg:   "safety",
  max_rider_weight_kg:   "safety",
  min_rider_age:         "safety",
};

function groupForKey(key: string) {
  if (key.startsWith("page_")) return "typography";
  if (key.startsWith("section_")) return "homepage_sections";
  if (key.startsWith("theme_")) return "theme";
  return KEY_GROUPS[key];
}

function typeForValue(key: string, value: unknown) {
  if (key.endsWith("_font_size") || key.endsWith("_rotation")) return "number";
  return typeof value;
}

function isWebsiteCustomizationKey(key: string) {
  return (
    key.startsWith("page_") ||
    key.startsWith("section_") ||
    key.startsWith("theme_") ||
    key.startsWith("hero_") ||
    key.startsWith("seo_") ||
    key.startsWith("social_") ||
    key === "site_name" ||
    key === "site_tagline" ||
    key === "site_logo_url" ||
    key === "site_logo_size" ||
    key === "site_logo_text" ||
    key === "favicon_url" ||
    key === "social_sharing_image" ||
    key === "website_visible"
  );
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const keys = Object.keys(body);
  const permissionModule = keys.length > 0 && keys.every(isWebsiteCustomizationKey) ? "website_customization" : "settings";
  const action = permissionModule === "website_customization" ? "update" : "edit";
  const auth = await requireApiPermission(permissionModule, action);
  if (!auth.ok) return auth.response;
  const old = await prisma.setting.findMany({ where: { key: { in: Object.keys(body) } } });

  for (const [key, value] of Object.entries(body)) {
    const group = groupForKey(key);
    await prisma.setting.upsert({
      where:  { key },
      update: { value: value as any, type: typeForValue(key, value), ...(group ? { group } : {}) },
      create: { key, value: value as any, type: typeForValue(key, value), ...(group ? { group } : {}) },
    });
  }

  await logAudit({ userId: auth.dbUser.id, action: "SETTINGS_UPDATED", module: permissionModule, oldValue: old, newValue: body });

  return NextResponse.json({ success: true });
}
