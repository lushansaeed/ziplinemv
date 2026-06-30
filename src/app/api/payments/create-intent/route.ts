import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createPaymentIntent } from "@/lib/payments/stripe";
import { ensureBookingMediaColumns } from "@/lib/booking/media-schema-guard";
import { z } from "zod";

const schema = z.object({
  bookingId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await ensureBookingMediaColumns();

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

    const booking = await prisma.booking.findUnique({
      where:   { id: parsed.data.bookingId },
      select:  { id: true, total: true, currency: true, reference: true, paymentStatus: true },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.paymentStatus === "PAID") return NextResponse.json({ error: "Already paid" }, { status: 400 });

    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      booking.id,
      Number(booking.total),
      booking.currency.toLowerCase(),
      { reference: booking.reference }
    );

    return NextResponse.json({ clientSecret, paymentIntentId });
  } catch (err: any) {
    console.error("[create-intent]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
