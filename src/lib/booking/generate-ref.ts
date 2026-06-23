import { prisma } from "@/lib/prisma/client";

export async function generateUniqueBookingRef(): Promise<string> {
  const prefix = process.env.BOOKING_REF_PREFIX ?? "ZL";

  for (let attempt = 0; attempt < 10; attempt++) {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const ref = `${prefix}-${timestamp}${random}`;

    const existing = await prisma.booking.findUnique({
      where: { reference: ref },
      select: { id: true },
    });

    if (!existing) return ref;
  }

  // Fallback with full timestamp
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
