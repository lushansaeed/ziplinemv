import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking/create";
import { sendBookingConfirmation, sendAdminNewBookingAlert, sendBookingWaiverLink } from "@/lib/notifications/email";
import { sendBookingWaiverLinkWhatsApp } from "@/lib/notifications/whatsapp";
import { prisma } from "@/lib/prisma/client";
import { formatDate } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  slotId:               z.string().optional().default(""),
  packageId:            z.string(),
  addOnIds:             z.array(z.string()).default([]),
  addOnQuantities:      z.record(z.string(), z.number().int().min(0)).optional(),
  riderType:            z.enum(["tourist", "local"]).optional(),
  date:                 z.string(),
  numRiders:            z.number().min(1).max(20),
  customerName:         z.string().min(2),
  // Phone: accept any string with at least 5 chars (incl. dial code prefix)
  customerPhone:        z.string().min(5),
  customerPhoneCountry: z.string().default("MV"),
  // Email: valid email OR empty string (optional in some portals)
  customerEmail:        z.string().email().or(z.literal("")).optional().default(""),
  customerNationality:  z.string().default(""),
  customerHotel:        z.string().default(""),
  // Riders: optional — agent portal may not always send detailed rider info
  riders:               z.array(z.object({
    name:   z.string().default(""),
    age:    z.string().default(""),
    weight: z.string().default(""),
  })).default([]),
  promoCode:            z.string().optional(),
  affiliateCoupon:      z.string().optional(),
  affiliateLinkId:      z.string().optional(),
  affiliateSessionId:   z.string().optional(),
  paymentMethod:        z.string().optional(),
  transferSlipUrl:      z.string().optional(),
  transferSlipPath:     z.string().optional(),
  transferSlipFileName: z.string().optional(),
  // Agent/affiliate portal fields (passed through, not validated)
  source:               z.string().optional(),
  agentId:              z.string().optional(),
  affiliateId:          z.string().optional(),
  notes:                z.string().optional(),
});

async function publicPaymentSettings() {
  const defaults = {
    payment_card_enabled: false,
    payment_bank_transfer_enabled: true,
    payment_cash_enabled: true,
    payment_link_enabled: false,
  };
  const settings = await prisma.setting.findMany({ where: { key: { in: Object.keys(defaults) } } });
  return { ...defaults, ...Object.fromEntries(settings.map((setting) => [setting.key, setting.value])) };
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      console.error("[POST /api/bookings] Validation error:", parsed.error.flatten());
      return NextResponse.json({
        error:   "Invalid request",
        details: parsed.error.flatten(),
      }, { status: 400 });
    }

    const data = parsed.data;
    const source = data.source ?? "DIRECT";
    if ((source === "AGENT" || source === "WALK_IN" || source === "AFFILIATE") && !data.riderType) {
      return NextResponse.json({ error: "Customer type is required." }, { status: 400 });
    }
    if (source !== "WALK_IN" && !data.slotId) {
      return NextResponse.json({ error: "Time slot is required for this booking source." }, { status: 400 });
    }
    if (data.addOnQuantities) {
      const invalidAddOnQty = Object.values(data.addOnQuantities).some((qty) => qty > data.numRiders);
      if (invalidAddOnQty) {
        return NextResponse.json({ error: "Add-on quantity cannot exceed the number of riders." }, { status: 400 });
      }
    }
    const isPublicBooking = !data.agentId && !data.source;
    if (isPublicBooking) {
      const settings = await publicPaymentSettings();
      const paymentMethod = data.paymentMethod;
      const enabledByMethod: Record<string, unknown> = {
        card: settings.payment_card_enabled,
        bank_transfer: settings.payment_bank_transfer_enabled,
        cash: settings.payment_cash_enabled,
        payment_link: settings.payment_link_enabled,
      };

      if (!paymentMethod || !enabledByMethod[paymentMethod]) {
        return NextResponse.json({ error: "Selected payment method is not available." }, { status: 400 });
      }
      if (paymentMethod === "bank_transfer" && data.riderType !== "local") {
        return NextResponse.json({ error: "Bank transfer is available for locals only." }, { status: 400 });
      }
      if (paymentMethod === "bank_transfer" && !data.transferSlipUrl) {
        return NextResponse.json({ error: "Please attach your bank transfer slip." }, { status: 400 });
      }
    }

    const result = await createBooking(data as any);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Fire notifications asynchronously — don't block the response
    if (result.bookingId) {
      sendBookingConfirmation(result.bookingId).catch(console.error);
      sendBookingWaiverLink(result.bookingId).catch(console.error);
      sendAdminNewBookingAlert(result.bookingId).catch(console.error);
      (async () => {
        const booking = await prisma.booking.findUnique({
          where: { id: result.bookingId },
          include: { customer: true, slot: true },
        });
        if (!booking || !result.waiverShare?.url) return;
        await sendBookingWaiverLinkWhatsApp({
          phone: booking.customer.phone,
          reference: booking.reference,
          rideDate: formatDate(booking.bookingDate, "EEEE, d MMMM yyyy"),
          rideTime: booking.slot.startTime,
          numberOfRiders: booking.numRiders,
          waiverUrl: result.waiverShare.url,
        });
      })().catch(console.error);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/bookings]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
