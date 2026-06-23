import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { addonStatuses, ...rest } = body;
  const updateData: any = { ...rest };

  // Persist per-addon statuses in the notes JSON field
  if (addonStatuses) {
    const existing = await prisma.customerMediaDelivery.findUnique({
      where: { id: params.id },
      select: { notes: true },
    });
    let parsed: any = {};
    try { if (existing?.notes) parsed = JSON.parse(existing.notes); } catch {}
    parsed.addonStatuses = addonStatuses;
    updateData.notes = JSON.stringify(parsed);

    // Auto-derive overall status from per-addon statuses
    const statuses = Object.values(addonStatuses as Record<string, string>);
    if (statuses.length > 0) {
      if (statuses.every((s) => s === "SENT_TO_CUSTOMER"))
        updateData.deliveryStatus = "SENT_TO_CUSTOMER";
      else if (statuses.every((s) => ["UPLOADED","SENT_TO_CUSTOMER"].includes(s)))
        updateData.deliveryStatus = "UPLOADED";
      else if (statuses.some((s) => s === "ISSUE_REPORTED"))
        updateData.deliveryStatus = "ISSUE_REPORTED";
      else if (statuses.some((s) => s === "PROCESSING"))
        updateData.deliveryStatus = "PROCESSING";
    }
  }

  if (updateData.deliveryStatus === "SENT_TO_CUSTOMER" && !updateData.deliveredAt) {
    updateData.deliveredAt = new Date();
  }

  const delivery = await prisma.customerMediaDelivery.update({
    where: { id: params.id },
    data:  updateData,
  });

  return NextResponse.json(delivery);
}
