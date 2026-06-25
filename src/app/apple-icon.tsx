import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { unstable_noStore as noStore } from "next/cache";

export const runtime     = "nodejs";
export const size        = { width: 180, height: 180 };
export const contentType = "image/png";

async function getLogoUrl(): Promise<string | null> {
  noStore();
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "site_logo_url" } });
    const url = setting?.value as string | undefined;
    return url && url.length > 0 ? url : null;
  } catch { return null; }
}

export default async function AppleIcon() {
  const logoUrl = await getLogoUrl();

  if (logoUrl) {
    try {
      const res = await fetch(logoUrl, { next: { revalidate: 3600 } });
      if (res.ok) {
        const buffer   = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") ?? "image/png";
        return new NextResponse(buffer, {
          headers: { "Content-Type": mimeType, "Cache-Control": "public, max-age=3600" },
        });
      }
    } catch {}
  }

  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, background: "linear-gradient(135deg, #F5A623, #FF7B2E)", borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
          <path d="M3 17L12 3L21 17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7 17L12 9L17 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55"/>
        </svg>
      </div>
    ),
    { ...size }
  );
}
