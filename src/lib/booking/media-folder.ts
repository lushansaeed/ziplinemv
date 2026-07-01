import { BookingStatus, MediaFolderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { ensureBookingDriveFolder } from "@/lib/google-drive";
import { sendEmail } from "@/lib/email";
import { ensureBookingMediaColumns } from "@/lib/booking/media-schema-guard";
import {
  DEFAULT_MEDIA_EMAIL_SUBJECT,
  DEFAULT_MEDIA_EMAIL_TEMPLATE,
  MEDIA_EMAIL_HTML_KEY,
  MEDIA_EMAIL_SUBJECT_KEY,
} from "@/lib/booking/media-email-template";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => values[key] ?? "");
}

async function getMediaEmailTemplate() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: [MEDIA_EMAIL_SUBJECT_KEY, MEDIA_EMAIL_HTML_KEY] } },
  });
  const values = Object.fromEntries(settings.map((setting) => [setting.key, String(setting.value)]));
  return {
    subject: values[MEDIA_EMAIL_SUBJECT_KEY] || DEFAULT_MEDIA_EMAIL_SUBJECT,
    html: values[MEDIA_EMAIL_HTML_KEY] || DEFAULT_MEDIA_EMAIL_TEMPLATE,
  };
}

export async function ensureMediaFolderForBooking(bookingId: string, options: { force?: boolean } = {}) {
  await ensureBookingMediaColumns();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      reference: true,
      bookingDate: true,
      driveFolderId: true,
      driveFolderUrl: true,
      customer: { select: { phone: true } },
      checkIn: { select: { checkedInAt: true } },
    },
  });

  if (!booking) throw new Error("Booking not found.");
  if (!options.force && booking.driveFolderId && booking.driveFolderUrl) {
    return {
      created: false,
      folderId: booking.driveFolderId,
      folderUrl: booking.driveFolderUrl,
    };
  }

  const folder = await ensureBookingDriveFolder({
    bookingReference: booking.reference,
    customerPhone: booking.customer.phone,
    folderDate: booking.checkIn?.checkedInAt ?? new Date(),
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      driveFolderId: folder.id,
      driveFolderUrl: folder.url,
      driveFolderCreatedAt: new Date(),
      mediaFolderStatus: MediaFolderStatus.PENDING_UPLOAD,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: options.force ? "GOOGLE_DRIVE_MEDIA_FOLDER_RECREATED" : "GOOGLE_DRIVE_MEDIA_FOLDER_CREATED",
      module: "media",
      recordId: booking.id,
      newValue: {
        reference: booking.reference,
        folderId: folder.id,
        folderUrl: folder.url,
        path: folder.path,
      },
    },
  }).catch(() => {});

  return {
    created: true,
    folderId: folder.id,
    folderUrl: folder.url,
  };
}

export async function sendMediaFolderEmail(bookingId: string, options: { force?: boolean; userId?: string } = {}) {
  await ensureBookingMediaColumns();

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      reference: true,
      bookingStatus: true,
      mediaLinkEmailSentAt: true,
      customerId: true,
      customer: { select: { name: true, email: true } },
      addOns: {
        select: {
          quantity: true,
          addOn: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) return { sent: false, skipped: false, error: "Booking not found." };
  const addOnQuantity = booking.addOns.reduce((sum, item) => sum + item.quantity, 0);
  if (addOnQuantity <= 0) {
    await prisma.auditLog.create({
      data: {
        userId: options.userId,
        action: "MEDIA_FOLDER_EMAIL_SKIPPED_NO_ADDONS",
        module: "media",
        recordId: booking.id,
        newValue: { reference: booking.reference },
      },
    }).catch(() => {});
    return { sent: false, skipped: true, reason: "Booking has no add-ons." };
  }
  if (!options.force && booking.mediaLinkEmailSentAt) {
    return { sent: false, skipped: true, reason: "Media folder email already sent." };
  }
  if (!booking.customer.email) {
    return { sent: false, skipped: true, reason: "No customer email." };
  }
  if (!options.force && booking.bookingStatus !== BookingStatus.COMPLETED && booking.bookingStatus !== BookingStatus.COMPLETED_WITH_REMARKS) {
    return { sent: false, skipped: true, reason: "Booking is not completed." };
  }

  const folder = await ensureMediaFolderForBooking(bookingId);
  const template = await getMediaEmailTemplate();
  const templateValues = {
    firstName: escapeHtml(firstName(booking.customer.name)),
    customerName: escapeHtml(booking.customer.name),
    bookingReference: escapeHtml(booking.reference),
    driveFolderUrl: escapeHtml(folder.folderUrl),
  };
  const subject = renderTemplate(template.subject, templateValues);
  const sendResult = await sendEmail({
    to: booking.customer.email,
    subject,
    html: renderTemplate(template.html, templateValues),
    text: `Your Zipline Maldives media folder for ${booking.reference}: ${folder.folderUrl}\n\nPhotos and videos will be uploaded within 24 hours after your ride.`,
  });
  if (sendResult.rejected.length > 0 || sendResult.accepted.length === 0) {
    throw new Error(
      `SMTP did not accept the media email recipient. Accepted: ${sendResult.accepted.join(", ") || "none"}. Rejected: ${sendResult.rejected.join(", ") || "none"}.`
    );
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { mediaLinkEmailSentAt: new Date() },
  });

  await prisma.notificationLog.create({
    data: {
      type: "MEDIA_DELIVERY",
      recipientId: booking.customerId,
      channel: "email",
      to: booking.customer.email,
      subject,
      status: "sent",
      sentAt: new Date(),
      metadata: {
        bookingReference: booking.reference,
        messageId: sendResult.messageId,
        accepted: sendResult.accepted,
        addOns: booking.addOns.map((item) => ({ name: item.addOn.name, quantity: item.quantity })),
      },
    },
  }).catch(() => {});

  await prisma.auditLog.create({
    data: {
      userId: options.userId,
      action: options.force ? "MEDIA_FOLDER_EMAIL_RESENT" : "MEDIA_FOLDER_EMAIL_SENT",
      module: "media",
      recordId: booking.id,
      newValue: {
        reference: booking.reference,
        recipient: booking.customer.email,
        folderUrl: folder.folderUrl,
        messageId: sendResult.messageId,
        addOnQuantity,
      },
    },
  }).catch(() => {});

  return {
    sent: true,
    skipped: false,
    folderUrl: folder.folderUrl,
    messageId: sendResult.messageId,
    accepted: sendResult.accepted,
    rejected: sendResult.rejected,
  };
}

export async function markMediaFolderStatus(bookingId: string, status: MediaFolderStatus, userId?: string) {
  await ensureBookingMediaColumns();
  const uploadedAt = status === MediaFolderStatus.UPLOADED ? new Date() : null;

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      mediaFolderStatus: status,
      mediaUploadedAt: uploadedAt,
    },
    select: {
      id: true,
      reference: true,
      mediaFolderStatus: true,
      mediaUploadedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "MEDIA_FOLDER_STATUS_UPDATED",
      module: "media",
      recordId: bookingId,
      newValue: {
        reference: booking.reference,
        mediaFolderStatus: booking.mediaFolderStatus,
        mediaUploadedAt: booking.mediaUploadedAt,
      },
    },
  }).catch(() => {});

  return booking;
}
