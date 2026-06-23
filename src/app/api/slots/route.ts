import { NextRequest, NextResponse } from "next/server";
import { getSlotsForDate } from "@/lib/booking/slots";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date      = searchParams.get("date");
  const numRiders = parseInt(searchParams.get("riders") ?? "1");
  const activity  = searchParams.get("activity") ?? "zipline";

  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  try {
    const slots = await getSlotsForDate(activity, date, numRiders);
    return NextResponse.json({ slots });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
