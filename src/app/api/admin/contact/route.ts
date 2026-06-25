import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { ADMIN_AND_ABOVE } from "@/lib/auth/roles";

export async function PATCH(req: NextRequest) {
  const auth = await requireApiRole(ADMIN_AND_ABOVE);
  if (!auth.ok) return auth.response;

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
