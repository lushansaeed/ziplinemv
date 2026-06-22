import { NextResponse } from "next/server";
import { getPricingEngineConfig } from "@/lib/pricing-engine";

export async function GET() {
  return NextResponse.json(await getPricingEngineConfig());
}
