import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { touristPrice, localPrice, localPriceMvr } = await req.json();
  await prisma.package.update({
    where: { id: params.id },
    data:  { touristPrice, localPrice: localPrice ?? null, localPriceMvr: localPriceMvr ?? null },
  });
  return NextResponse.json({ success: true });
}
