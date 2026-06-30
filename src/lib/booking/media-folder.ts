import { BookingStatus, MediaFolderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import { ensureBookingDriveFolder } from "@/lib/google-drive";
import { sendEmail } from "@/lib/email";
import { ensureBookingMediaColumns } from "@/lib/booking/media-schema-guard";

function mediaFolderHtml(input: {
  customerName: string;
  reference: string;
  folderUrl: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#12313f;">
      <h1 style="font-size:24px;margin:0 0 16px;">Your Zipline Maldives media folder</h1>
      <p style="font-size:15px;line-height:1.6;">Hi ${input.customerName},</p>
      <p style="font-size:15px;line-height:1.6;">
        Thank you for riding with Zipline Maldives. Your media folder for booking
        <strong>${input.reference}</strong> is ready.
      </p>
      <p style="font-size:15px;line-height:1.6;">
        Photos and videos will be uploaded to this Google Drive folder within 24 hours after your ride.
      </p>
      <p style="margin:24px 0;">
        <a href="${input.folderUrl}" style="display:inline-block;background:#f5a623;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
          Open your media folder
        </a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#6b7280;">
        If the folder looks empty right now, please check again later. Our team uploads the final files after processing.
      </p>
    </div>
  `;
}

export async function ensureMediaFolderForBooking(bookingId: string) {
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
    },
  });

  if (!booking) throw new Error("Booking not found.");
  if (booking.driveFolderId && booking.driveFolderUrl) {
    return {
      created: false,
      folderId: booking.driveFolderId,
      folderUrl: booking.driveFolderUrl,
    };
  }

  const folder = await ensureBookingDriveFolder({
    bookingReference: booking.reference,
    customerPhone: booking.customer.phone,
    bookingDate: booking.bookingDate,
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
      action: "GOOGLE_DRIVE_MEDIA_FOLDER_CREATED",
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

  const folder = await ensureMediaFolderForBooking(bookingId);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      reference: true,
      bookingStatus: true,
      mediaLinkEmailSentAt: true,
      customerId: true,
      customer: { select: { name: true, email: true } },
    },
  });

  if (!booking) return { sent: false, skipped: false, error: "Booking not found." };
  if (!options.force && booking.mediaLinkEmailSentAt) {
    return { sent: false, skipped: true, reason: "Media folder email already sent." };
  }
  if (!booking.customer.email) {
    return { sent: false, skipped: true, reason: "No customer email." };
  }
  if (!options.force && booking.bookingStatus !== BookingStatus.COMPLETED && booking.bookingStatus !== BookingStatus.COMPLETED_WITH_REMARKS) {
    return { sent: false, skipped: true, reason: "Booking is not completed." };
  }

  await sendEmail({
    to: booking.customer.email,
    subject: `Your Zipline Maldives media folder | ${booking.reference}`,
    html: mediaFolderHtml({
      customerName: booking.customer.name,
      reference: booking.reference,
      folderUrl: folder.folderUrl,
    }),
    text: `Your Zipline Maldives media folder for ${booking.reference}: ${folder.folderUrl}\n\nPhotos and videos will be uploaded within 24 hours after your ride.`,
  });

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
      subject: `Media folder — ${booking.reference}`,
      status: "sent",
      sentAt: new Date(),
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
      },
    },
  }).catch(() => {});

  return { sent: true, skipped: false, folderUrl: folder.folderUrl };
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
