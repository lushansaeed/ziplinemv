import { NextResponse } from "next/server";
import { getBookingSlotOptions } from "@/lib/booking-time-slots";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  const guests = Number(searchParams.get("guests") ?? "1");

  if (!date) {
    return NextResponse.json({ slots: [] });
  }

  const slots = await getBookingSlotOptions(date, Number.isFinite(guests) ? guests : 1);
  return NextResponse.json({ slots });
}
