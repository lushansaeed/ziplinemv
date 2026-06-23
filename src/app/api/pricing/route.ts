import { NextRequest, NextResponse } from "next/server";
import { calculatePrice } from "@/lib/pricing/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await calculatePrice(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
