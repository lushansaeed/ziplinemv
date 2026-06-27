import crypto from "crypto";
import QRCode from "qrcode";
import { WaiverStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma/client";

export function generateWaiverToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://zipline.mv"
  ).replace(/\/$/, "");
}

export function waiverUrlForToken(token: string) {
  return `${getSiteUrl()}/waiver/${token}`;
}

export function waiverCompletionStatus(completed: number, max: number) {
  if (completed <= 0) return "Not Started";
  if (completed >= max) return "Completed";
  return "Partially Completed";
}

export async function ensureBookingWaiverLink(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, numRiders: true, agentId: true },
  });
  if (!booking) return null;

  const completed = await prisma.waiver.count({
    where: { bookingId, status: WaiverStatus.SIGNED },
  });

  const existing = await prisma.bookingWaiverLink.findFirst({
    where: { bookingId, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    if (existing.maxSubmissions !== booking.numRiders || existing.currentSubmissions !== completed) {
      return prisma.bookingWaiverLink.update({
        where: { id: existing.id },
        data: {
          maxSubmissions: booking.numRiders,
          currentSubmissions: completed,
        },
      });
    }
    return existing;
  }

  return prisma.bookingWaiverLink.create({
    data: {
      bookingId,
      token: generateWaiverToken(),
      maxSubmissions: booking.numRiders,
      currentSubmissions: completed,
      createdByAgentId: booking.agentId,
    },
  });
}

export async function regenerateBookingWaiverLink(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, numRiders: true, agentId: true },
  });
  if (!booking) return null;

  const completed = await prisma.waiver.count({
    where: { bookingId, status: WaiverStatus.SIGNED },
  });

  await prisma.bookingWaiverLink.updateMany({
    where: { bookingId, isActive: true },
    data: { isActive: false, regeneratedAt: new Date() },
  });

  return prisma.bookingWaiverLink.create({
    data: {
      bookingId,
      token: generateWaiverToken(),
      maxSubmissions: booking.numRiders,
      currentSubmissions: completed,
      createdByAgentId: booking.agentId,
      regeneratedAt: new Date(),
    },
  });
}

export async function buildWaiverSharePayload(bookingId: string) {
  const link = await ensureBookingWaiverLink(bookingId);
  if (!link) return null;

  const url = waiverUrlForToken(link.token);
  const qrCode = await QRCode.toDataURL(url, {
    width: 320,
    margin: 2,
    color: { dark: "#0A0F1A", light: "#FFFFFF" },
  });

  return {
    ...link,
    url,
    qrCode,
    status: waiverCompletionStatus(link.currentSubmissions, link.maxSubmissions),
  };
}
