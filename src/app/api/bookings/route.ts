import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking/create";
import { sendBookingConfirmation, sendAdminNewBookingAlert } from "@/lib/notifications/email";
import { z } from "zod";

const schema = z.object({
  slotId:               z.string(),
  packageId:            z.string(),
  addOnIds:             z.array(z.string()).default([]),
  addOnQuantities:      z.record(z.string(), z.number()).optional(),
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
  paymentMethod:        z.string().optional(),
  // Agent/affiliate portal fields (passed through, not validated)
  source:               z.string().optional(),
  agentId:              z.string().optional(),
  affiliateId:          z.string().optional(),
  notes:                z.string().optional(),
});

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

    const result = await createBooking(parsed.data as any);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Fire notifications asynchronously — don't block the response
    if (result.bookingId) {
      sendBookingConfirmation(result.bookingId).catch(console.error);
      sendAdminNewBookingAlert(result.bookingId).catch(console.error);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/bookings]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
