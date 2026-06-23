import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { price, ...rest } = await req.json();
  const addon = await prisma.addOn.update({
    where: { id: params.id },
    data: { ...rest, ...(price !== undefined ? { price: parseFloat(price) } : {}) },
  });
  return NextResponse.json(addon);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.bookingAddOn.count({ where: { addOnId: params.id } });
  if (count > 0) return NextResponse.json({ error: "Add-on has bookings" }, { status: 409 });

  await prisma.addOn.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
