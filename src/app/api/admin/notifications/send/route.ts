import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sendBookingConfirmation,
  sendBookingCancellation,
  sendWaiverReminder,
  sendMediaDeliveryNotification,
} from "@/lib/notifications/email";

const HANDLERS: Record<string, (bookingId: string, extra?: string) => Promise<any>> = {
  booking_confirmation:  (id)         => sendBookingConfirmation(id),
  booking_cancellation:  (id)         => sendBookingCancellation(id),
  waiver_reminder:       (id)         => sendWaiverReminder(id),
  media_delivery:        (id, url)    => sendMediaDeliveryNotification(id, url!),
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, bookingId, extra } = await req.json();

  const handler = HANDLERS[type];
  if (!handler) return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });

  try {
    const result = await handler(bookingId, extra);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
