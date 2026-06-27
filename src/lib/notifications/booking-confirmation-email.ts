import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWaiverSharePayload } from "@/lib/waivers/links";
import { sendMail } from "./mailer";
import { DEFAULT_BOOKING_CONFIRMATION_SUBJECT, DEFAULT_BOOKING_CONFIRMATION_TEMPLATE } from "./booking-confirmation-template";

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

function getBookedVia(booking: any) {
  if (booking.agent?.businessName) return booking.agent.businessName;
  if (booking.affiliate?.name) return booking.affiliate.name;
  if (booking.source === "WALK_IN") return "Walk-in";
  return "Direct";
}

export async function sendBookingConfirmationEmail(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      package: true,
      slot: true,
      addOns: { include: { addOn: { select: { name: true } } } },
      agent: { select: { businessName: true } },
      affiliate: { select: { name: true } },
    },
  });

  if (!booking) return { sent: false, reason: "Booking not found" };
  if (!booking.customer.email) return { sent: false, reason: "No email" };

  const templateSettings = await prisma.setting.findMany({
    where: { key: { in: ["email_booking_confirmation_subject", "email_booking_confirmation_html"] } },
    select: { key: true, value: true },
  });
  const settingsMap = Object.fromEntries(templateSettings.map((setting) => [setting.key, String(setting.value)]));

  const waiverShare = await buildWaiverSharePayload(booking.id);
  const waiverLink = waiverShare?.url ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://zipline.mv"}/book/confirmation?ref=${booking.reference}`;
  const qrCodeBlock = waiverShare?.qrCode
    ? `<div class="qr-wrap"><img src="cid:waiverQrCode" alt="Waiver QR code" /></div>`
    : "";
  const qrBase64 = waiverShare?.qrCode?.includes(",")
    ? waiverShare.qrCode.split(",")[1]
    : waiverShare?.qrCode;
  const addonsSummary = booking.addOns.length > 0
    ? booking.addOns.map((item) => `${item.quantity}x ${item.addOn.name}`).join(", ")
    : "None";
  const placeholders = {
    customerName: escapeHtml(booking.customer.name),
    bookingReference: escapeHtml(booking.reference),
    rideDate: escapeHtml(formatDate(booking.bookingDate, "EEEE, d MMMM yyyy")),
    reportingTime: escapeHtml(booking.slot.startTime),
    numberOfRiders: escapeHtml(`${booking.numRiders} rider${booking.numRiders === 1 ? "" : "s"}`),
    addonsSummary: escapeHtml(addonsSummary),
    bookedVia: escapeHtml(getBookedVia(booking)),
    currency: escapeHtml(booking.currency),
    totalAmount: escapeHtml(formatCurrency(Number(booking.total), booking.currency).replace(/^[^\d-]+/, "")),
    waiverLink: escapeHtml(waiverLink),
    qrCodeBlock,
  };
  const subject = renderTemplate(
    settingsMap.email_booking_confirmation_subject || DEFAULT_BOOKING_CONFIRMATION_SUBJECT,
    placeholders
  );
  const html = renderTemplate(
    settingsMap.email_booking_confirmation_html || DEFAULT_BOOKING_CONFIRMATION_TEMPLATE,
    placeholders
  );

  try {
    await sendMail({
      to: booking.customer.email,
      subject,
      html,
      attachments: qrBase64
        ? [{ filename: `${booking.reference}-waiver-qr.png`, content: qrBase64, encoding: "base64", cid: "waiverQrCode" }]
        : undefined,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        confirmationEmailSent: true,
        confirmationEmailSentAt: new Date(),
        confirmationEmailError: null,
        confirmationEmailRecipient: booking.customer.email,
      },
    });

    await prisma.notificationLog.create({
      data: {
        type: "BOOKING_CONFIRMATION" as any,
        recipientId: booking.customerId,
        channel: "email",
        to: booking.customer.email,
        subject,
        status: "sent",
        sentAt: new Date(),
      },
    });

    return { sent: true };
  } catch (error: any) {
    const message = error?.message ?? "Email sending failed";
    console.error("[sendBookingConfirmationEmail]", {
      bookingId: booking.id,
      reference: booking.reference,
      recipient: booking.customer.email,
      error: message,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        confirmationEmailSent: false,
        confirmationEmailError: message,
        confirmationEmailRecipient: booking.customer.email,
      },
    });

    await prisma.notificationLog.create({
      data: {
        type: "BOOKING_CONFIRMATION" as any,
        recipientId: booking.customerId,
        channel: "email",
        to: booking.customer.email,
        subject,
        status: "failed",
        error: message,
      },
    });

    return { sent: false, error: message };
  }
}
