import { format } from "date-fns";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/email";
import { formatCurrency } from "@/lib/utils";
import { getDayEndReport } from "@/lib/reports/day-end";
import {
  DAY_END_EMAIL_HTML_KEY,
  DAY_END_EMAIL_RECIPIENTS_KEY,
  DAY_END_EMAIL_SUBJECT_KEY,
  DEFAULT_DAY_END_EMAIL_SUBJECT,
  DEFAULT_DAY_END_EMAIL_TEMPLATE,
} from "@/lib/reports/day-end-email-template";

let notificationTypeEnsured = false;

async function ensureDayEndNotificationType() {
  if (notificationTypeEnsured) return;
  await prisma.$executeRawUnsafe(`ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DAY_END_REPORT';`).catch(() => {});
  notificationTypeEnsured = true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? "");
}

function parseRecipients(value: unknown) {
  return String(value ?? "")
    .split(/[\n,;]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function generatedTime() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Indian/Maldives",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function getSettings() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: [DAY_END_EMAIL_RECIPIENTS_KEY, DAY_END_EMAIL_SUBJECT_KEY, DAY_END_EMAIL_HTML_KEY] } },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  return {
    recipients: parseRecipients(map[DAY_END_EMAIL_RECIPIENTS_KEY]),
    subject: String(map[DAY_END_EMAIL_SUBJECT_KEY] ?? DEFAULT_DAY_END_EMAIL_SUBJECT),
    html: String(map[DAY_END_EMAIL_HTML_KEY] ?? DEFAULT_DAY_END_EMAIL_TEMPLATE),
  };
}

function moneyValue(value: number, currency: string) {
  return formatCurrency(value, currency);
}

function buildAttentionBlock(complimentaryMvr: number, complimentaryUsd: number) {
  if (complimentaryMvr <= 0 && complimentaryUsd <= 0) return "";
  return `<div style="padding:12px 28px 0;">
    <div style="background:#FAEEDA;border-radius:8px;padding:12px 14px;color:#854F0B;">
      <div style="font-size:12px;font-weight:500;">Needs review</div>
      <div style="font-size:12px;margin-top:3px;line-height:1.5;">Complimentary value recorded: ${moneyValue(complimentaryMvr, "MVR")} and ${moneyValue(complimentaryUsd, "USD")}.</div>
    </div>
  </div>`;
}

function pdfBufferFromDoc(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.end();
  });
}

export async function buildDayEndPdf(date: string, location: string) {
  const report = await getDayEndReport({ date, location });
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 18, bottom: 28, left: 36, right: 36 } });

  doc.font("Helvetica-Bold").fontSize(18).text("Zipline Maldives - Daily Sales Report");
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#666").text(`${format(new Date(date), "EEE, dd MMM yyyy")} - ${location}`);
  doc.moveDown(0.8);
  doc.moveTo(36, doc.y).lineTo(576, doc.y).strokeColor("#D85A30").lineWidth(2).stroke();
  doc.moveDown();

  const paidMvr = report.cashDrawer.mvrCashSales + report.cardReconciliation.expectedMvr + report.bankTransferReconciliation.expectedMvr;
  const paidUsd = report.cashDrawer.usdCashSales + report.cardReconciliation.expectedUsd + report.bankTransferReconciliation.expectedUsd;

  doc.fillColor("#111").font("Helvetica-Bold").fontSize(12).text("Counter must match");
  doc.moveDown(0.4);
  doc.fontSize(22).text(moneyValue(paidMvr, "MVR"), { continued: true }).text(`    ${moneyValue(paidUsd, "USD")}`);
  doc.moveDown();

  const rows = [
    ["Opening float", moneyValue(report.openingFloat.mvr, "MVR"), moneyValue(report.openingFloat.usd, "USD")],
    ["Cash drawer expected", moneyValue(report.cashDrawer.expectedMvrCash, "MVR"), moneyValue(report.cashDrawer.expectedUsdCash, "USD")],
    ["Cash sales", moneyValue(report.cashDrawer.mvrCashSales, "MVR"), moneyValue(report.cashDrawer.usdCashSales, "USD")],
    ["Card settlement", moneyValue(report.cardReconciliation.expectedMvr, "MVR"), moneyValue(report.cardReconciliation.expectedUsd, "USD")],
    ["Bank receipts", moneyValue(report.bankTransferReconciliation.expectedMvr, "MVR"), moneyValue(report.bankTransferReconciliation.expectedUsd, "USD")],
    ["Complimentary value", moneyValue(report.paymentBreakdown.complimentary.MVR, "MVR"), moneyValue(report.paymentBreakdown.complimentary.USD, "USD")],
  ];
  for (const [label, mvr, usd] of rows) {
    doc.font("Helvetica").fontSize(10).fillColor("#555").text(label, 36, doc.y, { continued: false });
    doc.font("Helvetica-Bold").fillColor("#111").text(mvr, 300, doc.y - 12, { width: 120, align: "right" });
    doc.text(usd, 456, doc.y - 12, { width: 120, align: "right" });
    doc.moveDown(0.6);
  }

  doc.moveDown().font("Helvetica-Bold").fontSize(12).text("Bookings");
  doc.font("Helvetica").fontSize(10).fillColor("#111").text(`${report.summary.bookings} bookings - ${report.summary.riders} riders`);
  doc.moveDown();

  doc.font("Helvetica-Bold").fontSize(12).text("Add-on sales");
  for (const item of report.addOnSales) {
    doc.font("Helvetica").fontSize(10).text(`${item.name}: ${item.quantity} qty - ${moneyValue(item.localTotal, "MVR")} / ${moneyValue(item.touristTotal, "USD")}`);
  }

  doc.moveDown().font("Helvetica").fontSize(8).fillColor("#999").text("Confidential - internal use only", 36, 740);
  return pdfBufferFromDoc(doc);
}

export async function sendDayEndReportEmail(input: {
  date: string;
  location: string;
  submittedBy?: string | null;
  testRecipient?: string;
}) {
  const settings = await getSettings();
  const recipients = input.testRecipient ? [input.testRecipient] : settings.recipients;
  if (recipients.length === 0) return { sent: false, reason: "No day-end report recipients configured." };

  const report = await getDayEndReport({ date: input.date, location: input.location });
  const paidMvr = report.cashDrawer.mvrCashSales + report.cardReconciliation.expectedMvr + report.bankTransferReconciliation.expectedMvr;
  const paidUsd = report.cashDrawer.usdCashSales + report.cardReconciliation.expectedUsd + report.bankTransferReconciliation.expectedUsd;
  const reportUrl = `${process.env.NEXT_PUBLIC_ADMIN_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://ziplinemv-beta.vercel.app"}/admin/reports/day-end?date=${encodeURIComponent(input.date)}&location=${encodeURIComponent(input.location)}`;
  const values = {
    reportDate: escapeHtml(format(new Date(input.date), "dd MMM")),
    reportDateLong: escapeHtml(format(new Date(input.date), "EEEE, dd MMMM yyyy")),
    generatedTime: escapeHtml(generatedTime()),
    location: escapeHtml(input.location),
    submittedBy: escapeHtml(input.submittedBy || "Operations"),
    bookingCount: String(report.summary.bookings),
    riderCount: String(report.summary.riders),
    mvrCollected: escapeHtml(moneyValue(paidMvr, "MVR")),
    usdCollected: escapeHtml(moneyValue(paidUsd, "USD")),
    mvrCashExpected: escapeHtml(moneyValue(report.cashDrawer.expectedMvrCash, "MVR")),
    usdCashExpected: escapeHtml(moneyValue(report.cashDrawer.expectedUsdCash, "USD")),
    mvrCard: escapeHtml(moneyValue(report.cardReconciliation.expectedMvr, "MVR")),
    usdCard: escapeHtml(moneyValue(report.cardReconciliation.expectedUsd, "USD")),
    mvrBank: escapeHtml(moneyValue(report.bankTransferReconciliation.expectedMvr, "MVR")),
    usdBank: escapeHtml(moneyValue(report.bankTransferReconciliation.expectedUsd, "USD")),
    complimentaryMvr: escapeHtml(moneyValue(report.paymentBreakdown.complimentary.MVR, "MVR")),
    complimentaryUsd: escapeHtml(moneyValue(report.paymentBreakdown.complimentary.USD, "USD")),
    reportUrl: escapeHtml(reportUrl),
    pdfFileName: `Daily-Sales-Report_${input.date}.pdf`,
    attentionBlock: buildAttentionBlock(report.paymentBreakdown.complimentary.MVR, report.paymentBreakdown.complimentary.USD),
  };
  const subject = renderTemplate(settings.subject, values);
  const html = renderTemplate(settings.html, values);
  const pdf = await buildDayEndPdf(input.date, input.location);

  try {
    await sendEmail({
      to: recipients.join(", "),
      subject,
      html,
      attachments: [{ filename: values.pdfFileName, content: pdf, contentType: "application/pdf" }],
    });
    await ensureDayEndNotificationType();
    await prisma.notificationLog.create({
      data: {
        type: "DAY_END_REPORT",
        channel: "email",
        to: recipients.join(", "),
        subject,
        status: "sent",
        sentAt: new Date(),
        metadata: { date: input.date, location: input.location, test: Boolean(input.testRecipient) },
      },
    });
    return { sent: true, recipients };
  } catch (error: any) {
    const message = error?.message ?? "Day-end report email failed";
    await ensureDayEndNotificationType();
    await prisma.notificationLog.create({
      data: {
        type: "DAY_END_REPORT",
        channel: "email",
        to: recipients.join(", "),
        subject,
        status: "failed",
        error: message,
        metadata: { date: input.date, location: input.location, test: Boolean(input.testRecipient) },
      },
    }).catch(() => {});
    console.error("[day-end-email] failed", { date: input.date, location: input.location, recipients, error: message });
    return { sent: false, error: message };
  }
}
