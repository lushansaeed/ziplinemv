import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

export async function GET(req: NextRequest) {
  const keys = req.nextUrl.searchParams.get("keys")?.split(",").filter(Boolean) ?? [];
  if (keys.length === 0) return NextResponse.json({});
  try {
    const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const result = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({});
  }
}
