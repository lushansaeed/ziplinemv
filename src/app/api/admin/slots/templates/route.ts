import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { activityId, dayOfWeek, startTime, endTime, capacity } = await req.json();
  if (!activityId || dayOfWeek == null || !startTime || !endTime) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const template = await prisma.slotTemplate.create({
    data: { activityId, dayOfWeek, startTime, endTime, capacity: capacity ?? 8, active: true },
  });

  return NextResponse.json(template, { status: 201 });
}
