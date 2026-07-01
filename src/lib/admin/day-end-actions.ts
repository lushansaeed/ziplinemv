"use server";

import { revalidatePath } from "next/cache";
import { DayEndClosingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { logAudit, requirePermission } from "@/lib/auth/permissions";
import { ensureDayEndReportingSchema } from "@/lib/reports/day-end-schema-guard";
import { getDayEndReport } from "@/lib/reports/day-end";

function decimalInput(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringInput(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCounterFloat(formData: FormData) {
  const user = await requirePermission("payments", "edit");
  await ensureDayEndReportingSchema();

  const location = stringInput(formData.get("location")) || "Main Counter";
  const effectiveDate = stringInput(formData.get("effectiveDate"));
  if (!effectiveDate) return { success: false, error: "Effective date is required." };

  await prisma.counterFloat.create({
    data: {
      location,
      mvrAmount: decimalInput(formData.get("mvrAmount")),
      usdAmount: decimalInput(formData.get("usdAmount")),
      effectiveDate: new Date(effectiveDate),
      notes: stringInput(formData.get("notes")) || null,
      createdByUserId: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: "COUNTER_FLOAT_CREATED",
    module: "payments",
    newValue: { location, effectiveDate },
  }).catch(() => {});

  revalidatePath("/admin/reports/day-end");
  return { success: true };
}

export async function submitDayEndClosing(formData: FormData) {
  const user = await requirePermission("payments", "create");
  await ensureDayEndReportingSchema();

  const date = stringInput(formData.get("date"));
  const location = stringInput(formData.get("location")) || "Main Counter";
  if (!date) return { success: false, error: "Report date is required." };

  const report = await getDayEndReport({ date, location });
  const actualMvrCash = decimalInput(formData.get("actualMvrCash"));
  const actualUsdCash = decimalInput(formData.get("actualUsdCash"));
  const actualMvrCard = decimalInput(formData.get("actualMvrCard"));
  const actualUsdCard = decimalInput(formData.get("actualUsdCard"));
  const actualMvrBankTransfer = decimalInput(formData.get("actualMvrBankTransfer"));
  const actualUsdBankTransfer = decimalInput(formData.get("actualUsdBankTransfer"));
  const notes = stringInput(formData.get("notes"));
  const reportDate = new Date(date);

  const existing = await prisma.dayEndClosing.findFirst({
    where: { reportDate, location, cashierId: user.id },
    select: { id: true, status: true },
  });

  if (existing?.status === DayEndClosingStatus.APPROVED) {
    return { success: false, error: "This day-end closing is approved. Ask an admin to reopen it before editing." };
  }

  const data = {
    reportDate,
    location,
    cashierId: user.id,
    status: DayEndClosingStatus.SUBMITTED,
    openingMvrFloat: report.openingFloat.mvr,
    openingUsdFloat: report.openingFloat.usd,
    expectedMvrCash: report.cashDrawer.expectedMvrCash,
    expectedUsdCash: report.cashDrawer.expectedUsdCash,
    actualMvrCash,
    actualUsdCash,
    actualMvrCard,
    actualUsdCard,
    actualMvrBankTransfer,
    actualUsdBankTransfer,
    mvrCashDifference: actualMvrCash - report.cashDrawer.expectedMvrCash,
    usdCashDifference: actualUsdCash - report.cashDrawer.expectedUsdCash,
    mvrCardDifference: actualMvrCard - report.cardReconciliation.expectedMvr,
    usdCardDifference: actualUsdCard - report.cardReconciliation.expectedUsd,
    mvrBankTransferDifference: actualMvrBankTransfer - report.bankTransferReconciliation.expectedMvr,
    usdBankTransferDifference: actualUsdBankTransfer - report.bankTransferReconciliation.expectedUsd,
    notes: notes || null,
    submittedByUserId: user.id,
    submittedAt: new Date(),
  };

  const closing = existing
    ? await prisma.dayEndClosing.update({ where: { id: existing.id }, data })
    : await prisma.dayEndClosing.create({ data });

  await logAudit({
    userId: user.id,
    action: "DAY_END_CLOSING_SUBMITTED",
    module: "reports",
    recordId: closing.id,
    newValue: { date, location },
  }).catch(() => {});

  revalidatePath("/admin/reports/day-end");
  return { success: true };
}

export async function approveDayEndClosing(closingId: string) {
  const user = await requirePermission("reports", "export");
  await ensureDayEndReportingSchema();

  await prisma.dayEndClosing.update({
    where: { id: closingId },
    data: { status: DayEndClosingStatus.APPROVED, approvedByUserId: user.id, approvedAt: new Date() },
  });

  await logAudit({ userId: user.id, action: "DAY_END_CLOSING_APPROVED", module: "reports", recordId: closingId }).catch(() => {});
  revalidatePath("/admin/reports/day-end");
  return { success: true };
}

export async function reopenDayEndClosing(closingId: string, reason: string) {
  const user = await requirePermission("reports", "export");
  await ensureDayEndReportingSchema();

  await prisma.dayEndClosing.update({
    where: { id: closingId },
    data: {
      status: DayEndClosingStatus.REOPENED,
      reopenedByUserId: user.id,
      reopenedAt: new Date(),
      reopenReason: reason,
    },
  });

  await logAudit({
    userId: user.id,
    action: "DAY_END_CLOSING_REOPENED",
    module: "reports",
    recordId: closingId,
    newValue: { reason },
  }).catch(() => {});
  revalidatePath("/admin/reports/day-end");
  return { success: true };
}
