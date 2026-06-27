import { Resend } from "resend";
import { prisma } from "@/lib/prisma/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { buildWaiverSharePayload } from "@/lib/waivers/links";
import { sendBookingConfirmationEmail } from "./booking-confirmation-email";

// Lazy init — avoids build-time error when RESEND_API_KEY is not set
const getResend = () => new Resend(process.env.RESEND_API_KEY ?? "placeholder");
const FROM   = process.env.EMAIL_FROM ?? "Zipline Maldives <hello@zipline.mv>";

// ─── Email HTML builder ───────────────────────────────────────────────────────

function emailWrapper(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Zipline Maldives</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#0A0F1A;font-family:system-ui,-apple-system,sans-serif;">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0F1A;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#F5A623,#FF7B2E);padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
            <p style="margin:0;font-size:11px;color:rgba(10,15,26,0.7);letter-spacing:2px;text-transform:uppercase;font-weight:600;">
              Maldives' First Island-to-Island Zipline
            </p>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:800;color:#0A0F1A;letter-spacing:-0.5px;">
              Zipline Maldives
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#111827;padding:40px;border-radius:0 0 16px 16px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 0;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.25);">
              © ${new Date().getFullYear()} Zipline Maldives · Vahmāfushi Island, South Malé Atoll, Maldives
            </p>
            <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,0.2);">
              Maafushi → Vahmāfushi · 428m · 45–60 seconds of pure flight
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function h2(text: string) {
  return `<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;">${text}</h2>`;
}
function p(text: string, muted = false) {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${muted ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.85)"};">${text}</p>`;
}
function detail(label: string, value: string) {
  return `<tr>
    <td style="padding:10px 16px;font-size:13px;color:rgba(255,255,255,0.45);border-bottom:1px solid rgba(255,255,255,0.06);width:40%;">${label}</td>
    <td style="padding:10px 16px;font-size:13px;color:#ffffff;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">${value}</td>
  </tr>`;
}
function table(rows: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:12px;overflow:hidden;margin:20px 0;">${rows}</table>`;
}
function cta(text: string, url: string) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#F5A623,#FF7B2E);color:#0A0F1A;font-weight:700;font-size:15px;padding:14px 32px;border-radius:100px;text-decoration:none;">
      ${text}
    </a>
  </div>`;
}
function badge(text: string, color = "#F5A623") {
  return `<span style="display:inline-block;background:${color}20;color:${color};padding:4px 10px;border-radius:100px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${text}</span>`;
}

// ─── Email senders ────────────────────────────────────────────────────────────

export async function sendBookingConfirmation(bookingId: string) {
  return sendBookingConfirmationEmail(bookingId);
}

export async function sendBookingWaiverLink(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, slot: true },
  });

  if (!booking || !booking.customer.email) return { sent: false, reason: "No email" };

  const waiverShare = await buildWaiverSharePayload(booking.id);
  if (!waiverShare) return { sent: false, reason: "No waiver link" };

  const rideDate = formatDate(booking.bookingDate, "EEEE, d MMMM yyyy");
  const html = emailWrapper(`
    <div style="margin-bottom:24px;">${badge("Waiver forms required", "#F5A623")}</div>
    ${h2("Zipline Waiver Form for Your Booking")}
    ${p(`Hi ${booking.customer.name},`)}
    ${p("Thank you for your booking with Zipline Maldives.")}
    ${p("Please ask each rider to complete the waiver form before the ride using the link below:")}
    ${cta("Open waiver form", waiverShare.url)}
    ${p(`You may also scan the attached QR code to open the waiver form.`, true)}
    ${table(`
      ${detail("Booking Reference", booking.reference)}
      ${detail("Ride Date", rideDate)}
      ${detail("Ride Time", booking.slot.startTime)}
      ${detail("Number of Riders", String(booking.numRiders))}
    `)}
    <div style="background:rgba(255,255,255,0.04);border-radius:12px;padding:20px;margin-top:24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#ffffff;">Important</p>
      <ul style="margin:0;padding:0 0 0 20px;font-size:13px;line-height:2;color:rgba(255,255,255,0.6);">
        <li>Each rider must complete a separate waiver form.</li>
        <li>The waiver link will allow submissions only up to the number of riders in your booking.</li>
        <li>The same phone or device may be used to complete waivers for multiple riders.</li>
        <li>For children, the waiver must be completed and signed by a parent or legal guardian.</li>
        <li>Elderly riders or riders without a phone may complete the waiver using another guest's phone or at the reception counter.</li>
      </ul>
    </div>
    ${p("Thank you,<br/>Zipline Maldives Team")}
  `, `Complete rider waivers for booking ${booking.reference}.`);

  const qrBase64 = waiverShare.qrCode.includes(",")
    ? waiverShare.qrCode.split(",")[1]
    : waiverShare.qrCode;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: booking.customer.email,
    subject: `Zipline Waiver Form for Your Booking - ${booking.reference}`,
    html,
    attachments: [
      {
        filename: `${booking.reference}-waiver-qr.png`,
        content: qrBase64,
      },
    ],
  });

  await logNotification({
    type: "WAIVER_LINK",
    recipientId: booking.customerId,
    channel: "email",
    to: booking.customer.email,
    subject: `Zipline Waiver Form for Your Booking - ${booking.reference}`,
    status: error ? "failed" : "sent",
    error: error?.message,
  });

  return { sent: !error, error: error?.message };
}

export async function sendBookingCancellation(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, package: true, slot: true },
  });

  if (!booking || !booking.customer.email) return { sent: false };

  const html = emailWrapper(`
    <div style="margin-bottom:24px;">${badge("Booking Cancelled", "#ef4444")}</div>
    ${h2("Your booking has been cancelled.")}
    ${p(`We're sorry to see you go. Your booking <strong style="color:#F5A623;">${booking.reference}</strong> has been cancelled.`, true)}
    ${table(`
      ${detail("Reference", booking.reference)}
      ${detail("Date",      formatDate(booking.bookingDate, "EEEE, d MMMM yyyy"))}
      ${detail("Package",   booking.package.name)}
    `)}
    ${p("If you'd like to rebook, we'd love to have you back.", true)}
    ${cta("Book again", `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://zipline.mv"}/book`)}
  `, `Your booking ${booking.reference} has been cancelled.`);

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      booking.customer.email,
    subject: `Booking cancelled — ${booking.reference} | Zipline Maldives`,
    html,
  });

  await logNotification({ type: "BOOKING_CANCELLATION", recipientId: booking.customerId, channel: "email", to: booking.customer.email, subject: `Booking cancelled — ${booking.reference}`, status: error ? "failed" : "sent", error: error?.message });
  return { sent: !error };
}

export async function sendWaiverReminder(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, slot: true, waivers: { where: { status: "PENDING" } } },
  });

  if (!booking || !booking.customer.email || booking.waivers.length === 0) return { sent: false };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zipline.mv";
  const html = emailWrapper(`
    <div style="margin-bottom:24px;">${badge("Action required", "#F5A623")}</div>
    ${h2("Don't forget to sign your waiver!")}
    ${p(`Your zipline experience is on <strong style="color:#ffffff;">${formatDate(booking.bookingDate, "EEEE, d MMMM")}</strong> at <strong style="color:#ffffff;">${booking.slot.startTime}</strong>. Please sign your waiver before arrival.`, true)}
    ${p(`${booking.waivers.length} rider waiver${booking.waivers.length > 1 ? "s" : ""} still need${booking.waivers.length === 1 ? "s" : ""} to be signed.`)}
    ${cta("Sign waiver now", `${siteUrl}/book/confirmation?ref=${booking.reference}`)}
    ${p("Waivers can be signed at check-in, but completing them early saves time.", true)}
  `, `Sign your waiver for booking ${booking.reference}.`);

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      booking.customer.email,
    subject: `Reminder: Sign your waiver — ${booking.reference} | Zipline Maldives`,
    html,
  });

  await logNotification({ type: "WAIVER_REMINDER", recipientId: booking.customerId, channel: "email", to: booking.customer.email, subject: `Waiver reminder — ${booking.reference}`, status: error ? "failed" : "sent" });
  return { sent: !error };
}

export async function sendMediaDeliveryNotification(bookingId: string, mediaUrl: string) {
  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { customer: true, addOns: { include: { addOn: { select: { name: true } } } } },
  });

  if (!booking || !booking.customer.email) return { sent: false };

  const html = emailWrapper(`
    <div style="margin-bottom:24px;">${badge("Your media is ready 🎉", "#22c55e")}</div>
    ${h2("Your zipline memories have arrived!")}
    ${p(`Your ${booking.addOns.map((a) => a.addOn.name).join(", ")} from booking <strong style="color:#F5A623;">${booking.reference}</strong> is ready.`, true)}
    ${cta("Download your media", mediaUrl)}
    ${p("Links expire after 30 days. Download and save your content.", true)}
  `, "Your Zipline Maldives media is ready to download.");

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      booking.customer.email,
    subject: `Your Zipline Maldives media is ready 🎉 | ${booking.reference}`,
    html,
  });

  await logNotification({ type: "MEDIA_DELIVERY", recipientId: booking.customerId, channel: "email", to: booking.customer.email, subject: `Media ready — ${booking.reference}`, status: error ? "failed" : "sent" });
  return { sent: !error };
}

export async function sendAgentApprovalNotification(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where:   { id: agentId },
    select:  { email: true, businessName: true, contactPerson: true },
  });

  if (!agent?.email) return { sent: false };

  const siteUrl = process.env.NEXT_PUBLIC_AGENT_URL ?? "https://agents.zipline.mv";
  const html = emailWrapper(`
    <div style="margin-bottom:24px;">${badge("Application approved ✓", "#22c55e")}</div>
    ${h2(`Welcome to the Zipline MV agent programme!`)}
    ${p(`Hi ${agent.contactPerson}, your agent application for <strong style="color:#ffffff;">${agent.businessName}</strong> has been approved.`, true)}
    ${p("You can now log in to your agent portal to start creating bookings for your customers and earning commission.")}
    ${cta("Log in to agent portal", siteUrl)}
  `, "Your agent application has been approved.");

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      agent.email,
    subject: `Agent application approved — Welcome to Zipline Maldives`,
    html,
  });

  return { sent: !error };
}

export async function sendAffiliateApprovalNotification(affiliateId: string) {
  const affiliate = await prisma.affiliate.findUnique({
    where:   { id: affiliateId },
    select:  { email: true, name: true, contactPerson: true },
  });

  if (!affiliate?.email) return { sent: false };

  const siteUrl = process.env.NEXT_PUBLIC_AFFILIATE_URL ?? "https://affiliate.zipline.mv";
  const html = emailWrapper(`
    <div style="margin-bottom:24px;">${badge("Application approved ✓", "#F5A623")}</div>
    ${h2("Welcome to the Zipline MV affiliate programme!")}
    ${p(`Hi ${affiliate.contactPerson}, your affiliate application has been approved. You can now share your unique referral link and earn commission on every booking.`)}
    ${cta("Log in to affiliate portal", siteUrl)}
  `, "Your affiliate application has been approved.");

  const { error } = await getResend().emails.send({
    from:    FROM,
    to:      affiliate.email,
    subject: `Affiliate application approved — Welcome to Zipline Maldives`,
    html,
  });

  return { sent: !error };
}

export async function sendAdminNewBookingAlert(bookingId: string) {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!adminEmail) return { sent: false };

  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { customer: true, package: true },
  });
  if (!booking) return { sent: false };

  const html = emailWrapper(`
    ${h2("New booking received")}
    ${table(`
      ${detail("Reference", booking.reference)}
      ${detail("Customer",  booking.customer.name)}
      ${detail("Package",   booking.package.name)}
      ${detail("Riders",    String(booking.numRiders))}
      ${detail("Source",    booking.source)}
      ${detail("Total",     formatCurrency(Number(booking.total), booking.currency))}
    `)}
    ${cta("View in admin", `${process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.zipline.mv"}/admin/bookings`)}
  `);

  await getResend().emails.send({
    from:    FROM,
    to:      adminEmail,
    subject: `New booking: ${booking.reference} — ${booking.customer.name}`,
    html,
  });

  return { sent: true };
}

// ─── Notification log helper ──────────────────────────────────────────────────

async function logNotification(data: {
  type: string; recipientId?: string; channel: string;
  to: string; subject?: string; status: string; error?: string;
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        type:        data.type as any,
        recipientId: data.recipientId,
        channel:     data.channel,
        to:          data.to,
        subject:     data.subject,
        status:      data.status,
        sentAt:      data.status === "sent" ? new Date() : undefined,
        error:       data.error,
      },
    });
  } catch {
    // Don't let logging failures break the main flow
  }
}
