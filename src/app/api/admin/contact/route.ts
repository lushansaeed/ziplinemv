import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function PATCH(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { whatsapp, phone, email, address, mapsUrl, socialLinks, operatingHours } = body;

  const existing = await prisma.contactSetting.findFirst();
  if (existing) {
    await prisma.contactSetting.update({
      where: { id: existing.id },
      data:  { whatsapp, phone, email, address, mapsUrl, socialLinks, operatingHours },
    });
  } else {
    await prisma.contactSetting.create({ data: { whatsapp, phone, email, address, mapsUrl, socialLinks, operatingHours } });
  }

  return NextResponse.json({ success: true });
}
