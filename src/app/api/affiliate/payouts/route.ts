import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser    = await prisma.user.findUnique({ where: { supabaseUid: user.id } });
  const affiliate = await prisma.affiliate.findUnique({ where: { userId: dbUser?.id }, select: { id: true } });
  if (!dbUser || !affiliate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { amount, notes } = await req.json();

  // Check no active request
  const active = await prisma.payoutRequest.findFirst({
    where: { userId: dbUser.id, status: { in: ["PENDING", "PROCESSING"] } },
  });
  if (active) return NextResponse.json({ error: "You already have a pending payout request." }, { status: 409 });

  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const request = await prisma.payoutRequest.create({
    data: {
      userId:   dbUser.id,
      type:     "affiliate",
      amount,
      currency: "USD",
      status:   "PENDING",
      notes,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
