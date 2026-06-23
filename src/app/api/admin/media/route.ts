import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseUid: user.id } });
  const body = await req.json();

  const media = await prisma.websiteMedia.create({
    data: {
      categoryId:       body.categoryId,
      title:            body.title,
      caption:          body.caption,
      altText:          body.altText,
      type:             body.type,
      url:              body.url,
      storagePath:      body.storagePath,
      frontendLocation: body.frontendLocation,
      displayOrder:     body.displayOrder ?? 0,
      active:           true,
      uploadedById:     dbUser?.id,
    },
    include: { category: true },
  });

  return NextResponse.json(media, { status: 201 });
}
