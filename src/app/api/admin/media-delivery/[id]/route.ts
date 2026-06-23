import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const updateData: any = { ...body };
  if (body.deliveryStatus === "SENT_TO_CUSTOMER") {
    updateData.deliveredAt = new Date();
  }

  await prisma.customerMediaDelivery.update({ where: { id: params.id }, data: updateData });
  return NextResponse.json({ success: true });
}
