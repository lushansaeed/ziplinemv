import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: NextRequest) {
  // Verify admin session
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "query required" }, { status: 400 });

  try {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { reference:          { equals: q.toUpperCase() } },
          { customer: { phone:  { contains: q } } },
          { customer: { name:   { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        customer: { select: { name: true, phone: true } },
        package:  { select: { name: true } },
        slot:     { select: { startTime: true } },
        riders:   { select: { id: true, name: true, age: true, weight: true } },
        checkIn:  { select: { checkedInAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ booking: booking ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
