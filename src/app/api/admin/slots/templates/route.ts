import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { OPERATIONS_AND_ABOVE } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(OPERATIONS_AND_ABOVE);
  if (!auth.ok) return auth.response;

  const { activityId, dayOfWeek, startTime, endTime, capacity } = await req.json();
  if (!activityId || dayOfWeek == null || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const template = await prisma.slotTemplate.create({
    data: { activityId, dayOfWeek, startTime, endTime, capacity: capacity ?? 8, isActive: true },
  });

  return NextResponse.json(template, { status: 201 });
}
