import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { createPaymentLink } from "@/lib/payments/stripe";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await req.json();
  if (!bookingId) return NextResponse.json({ error: "bookingId required" }, { status: 400 });

  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { customer: true, package: true },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const url = await createPaymentLink(
    booking.id,
    Number(booking.total),
    booking.currency.toLowerCase(),
    booking.customer.email ?? undefined,
    `${booking.package.name} — Zipline Maldives (${booking.reference})`
  );

  // Update booking with payment link method
  await prisma.booking.update({
    where: { id: bookingId },
    data:  { paymentMethod: "PAYMENT_LINK" },
  });

  return NextResponse.json({ url });
}
