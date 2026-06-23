import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { prisma } from "@/lib/prisma/client";
import { sendBookingConfirmation } from "@/lib/notifications/email";
import { PaymentStatus, BookingStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event;
  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err: any) {
    console.error("[stripe webhook] signature error:", err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi        = event.data.object as any;
        const bookingId = pi.metadata?.bookingId;
        if (!bookingId) break;

        await prisma.$transaction([
          prisma.booking.update({
            where: { id: bookingId },
            data:  { paymentStatus: PaymentStatus.PAID, bookingStatus: BookingStatus.CONFIRMED },
          }),
          prisma.payment.create({
            data: {
              bookingId,
              amount:     pi.amount / 100,
              currency:   pi.currency.toUpperCase(),
              method:     "ONLINE",
              gatewayRef: pi.id,
              status:     PaymentStatus.PAID,
            },
          }),
          prisma.auditLog.create({
            data: {
              action:   "PAYMENT_RECEIVED",
              module:   "bookings",
              recordId: bookingId,
              newValue: { gateway: "stripe", amount: pi.amount / 100, currency: pi.currency },
            },
          }),
        ]);

        sendBookingConfirmation(bookingId).catch(console.error);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi        = event.data.object as any;
        const bookingId = pi.metadata?.bookingId;
        if (!bookingId) break;

        await prisma.booking.update({
          where: { id: bookingId },
          data:  { paymentStatus: PaymentStatus.FAILED },
        });
        break;
      }

      case "checkout.session.completed": {
        const session   = event.data.object as any;
        const bookingId = session.metadata?.bookingId;
        if (!bookingId) break;

        await prisma.booking.update({
          where: { id: bookingId },
          data:  { paymentStatus: PaymentStatus.PAID },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
