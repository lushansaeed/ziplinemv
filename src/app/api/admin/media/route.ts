import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { requireApiRole } from "@/lib/auth/api";
import { MEDIA_ACCESS } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const auth = await requireApiRole(MEDIA_ACCESS);
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.url) {
    return NextResponse.json({ error: "url is required — the file upload may have failed" }, { status: 400 });
  }

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
      uploadedById:     auth.dbUser.id,
    },
    include: { category: true },
  });

  return NextResponse.json(media, { status: 201 });
}
