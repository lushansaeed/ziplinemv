import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsWorkspace } from "@/components/admin/settings/settings-workspace";
import {
  DEFAULT_BOOKING_CONFIRMATION_SUBJECT,
  DEFAULT_BOOKING_CONFIRMATION_TEMPLATE,
} from "@/lib/notifications/booking-confirmation-template";

export const metadata: Metadata = { title: "Settings | Admin" };

async function getAllSettings() {
  const defaults = [
    { key: "payment_card_enabled", value: false, type: "boolean", group: "payments", label: "Credit / debit card" },
    { key: "payment_bank_transfer_enabled", value: true, type: "boolean", group: "payments", label: "Bank transfer" },
    { key: "payment_cash_enabled", value: true, type: "boolean", group: "payments", label: "Pay on arrival" },
    { key: "payment_link_enabled", value: false, type: "boolean", group: "payments", label: "Payment link" },
    { key: "payment_bank_account_name", value: "OSVANA GROUP PVT LTD", type: "string", group: "payments", label: "Bank account name" },
    { key: "payment_mvr_account", value: "7730000840403", type: "string", group: "payments", label: "MVR account" },
    { key: "payment_usd_account", value: "7730000840404", type: "string", group: "payments", label: "USD account" },
    { key: "email_booking_confirmation_subject", value: DEFAULT_BOOKING_CONFIRMATION_SUBJECT, type: "string", group: "email_templates", label: "Booking confirmation subject" },
    { key: "email_booking_confirmation_html", value: DEFAULT_BOOKING_CONFIRMATION_TEMPLATE, type: "string", group: "email_templates", label: "Booking confirmation HTML" },
  ];
  await Promise.all(defaults.map((setting) =>
    prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    })
  ));
  return prisma.setting.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
}

export default async function SettingsPage() {
  await requirePermission("settings", "view");
  const settings = await getAllSettings();
  return (
    <div>
      <PageHeader title="Platform Settings" description="Global configuration for the Zipline MV platform." />
      <SettingsWorkspace settings={settings} />
    </div>
  );
}
