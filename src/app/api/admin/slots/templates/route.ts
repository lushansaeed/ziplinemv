import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiPermission } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const auth = await requireApiPermission("slots", "create");
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
