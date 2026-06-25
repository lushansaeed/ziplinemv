import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { BOOKING_ACCESS } from "@/lib/auth/roles";

export async function GET(req: NextRequest) {
  const auth = await requireApiRole(BOOKING_ACCESS);
  if (!auth.ok) return auth.response;

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
