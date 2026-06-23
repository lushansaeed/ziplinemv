import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { activityId, name, description, price, currency, bestFor, rules, displayOrder, active } = await req.json();

  if (!activityId || !name || price === undefined) {
    return NextResponse.json({ error: "activityId, name and price are required" }, { status: 400 });
  }

  const addon = await prisma.addOn.create({
    data: {
      activityId,
      name,
      description: description || null,
      price:       parseFloat(price),
      currency:    currency ?? "USD",
      bestFor:     bestFor || null,
      rules:       rules || null,
      displayOrder: displayOrder ?? 0,
      active:      active ?? true,
    },
  });

  return NextResponse.json(addon, { status: 201 });
}
