import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { buildWaiverSharePayload } from "@/lib/waivers/links";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where:  { supabaseUid: user.id },
    select: { role: true, agent: { select: { id: true } } },
  });

  const booking = await prisma.booking.findFirst({
    where: {
      id: params.id,
      // Agents can only view their own bookings
      ...(dbUser?.role === "AGENT" ? { agentId: dbUser.agent?.id } : {}),
    },
    include: {
      customer: true,
      package:  true,
      slot:     true,
      riders:   true,
      addOns:   { include: { addOn: { select: { name: true } } } },
      waivers:  true,
      agentCommission: { select: { amount: true, status: true, breakdown: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const waiverShare = await buildWaiverSharePayload(booking.id);
  return NextResponse.json({ booking: { ...booking, waiverShare } });
}
