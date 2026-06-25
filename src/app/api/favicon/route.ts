import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export async function GET() {
  noStore();

  try {
    // Try to serve the custom uploaded logo
    const setting = await prisma.setting.findUnique({
      where: { key: "site_logo_url" },
    });
    const logoUrl = setting?.value as string | undefined;

    if (logoUrl && logoUrl.length > 10) {
      const res = await fetch(logoUrl, {
        headers: { "User-Agent": "Zipline-MV-Favicon/1.0" },
        cache: "no-store",
      });

      if (res.ok) {
        const buffer   = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") ?? "image/png";
        return new NextResponse(buffer, {
          headers: {
            "Content-Type":  mimeType,
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      }
    }
  } catch {
    // Fall through to static ICO
  }

  // Fallback: serve the static favicon.ico
  try {
    const ico = readFileSync(join(process.cwd(), "public", "favicon.ico"));
    return new NextResponse(ico, {
      headers: {
        "Content-Type":  "image/x-icon",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
