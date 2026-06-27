import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export const dynamic = "force-dynamic";

const DEFAULTS: Record<string, unknown> = {
  payment_card_enabled: false,
  payment_bank_transfer_enabled: true,
  payment_cash_enabled: true,
  payment_link_enabled: false,
  payment_bank_account_name: "OSVANA GROUP PVT LTD",
  payment_mvr_account: "7730000840403",
  payment_usd_account: "7730000840404",
};

export async function GET() {
  const keys = Object.keys(DEFAULTS);
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const values = { ...DEFAULTS, ...Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) };

  return NextResponse.json(values, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
