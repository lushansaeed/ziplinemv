import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { touristPrice, localPrice, childPrice, ...rest } = body;

  const pkg = await prisma.package.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(touristPrice !== undefined ? { touristPrice: parseFloat(touristPrice) } : {}),
      ...(localPrice !== undefined ? { localPrice: localPrice ? parseFloat(localPrice) : null } : {}),
      ...(childPrice !== undefined ? { childPrice: childPrice ? parseFloat(childPrice) : null } : {}),
    },
  });

  return NextResponse.json(pkg);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const count = await prisma.booking.count({ where: { packageId: params.id } });
  if (count > 0) return NextResponse.json({ error: "Package has bookings" }, { status: 409 });

  await prisma.package.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
