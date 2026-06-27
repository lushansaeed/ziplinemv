import { NextRequest, NextResponse } from "next/server";
import { calculatePrice } from "@/lib/pricing/engine";
import { z } from "zod";

const schema = z.object({
  packageId: z.string().min(1),
  addOnIds: z.array(z.string()).default([]),
  addOnQuantities: z.record(z.string(), z.number().int().min(0)).optional(),
  numRiders: z.number().int().min(1).max(20),
  date: z.string().min(1),
  riderType: z.enum(["tourist", "local"]).optional(),
  nationality: z.string().optional(),
  agentId: z.string().optional(),
  promoCode: z.string().optional(),
  affiliateCouponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await calculatePrice(parsed.data);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
