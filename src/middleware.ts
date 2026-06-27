import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON } from "@/lib/supabase/config";

// ─── Domain → route prefix mapping ──────────────────────────────────────────
const DOMAIN_MAP: Record<string, string> = {
  "admin.zipline.mv":     "/admin",
  "agents.zipline.mv":    "/agents",
  "affiliate.zipline.mv": "/affiliate",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // ── Refresh Supabase session ──────────────────────────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Determine required portal from hostname ───────────────────────────────
  const cleanHost = hostname.split(":")[0]; // strip port in dev
  const requiredPrefix = DOMAIN_MAP[cleanHost];

  // Public website — no auth required
  if (!requiredPrefix) return response;

  // ── Rewrite: add portal prefix to path so Next.js route groups work ───────
  // e.g. admin.zipline.mv/dashboard → /admin/dashboard
  const rewrittenPath = pathname.startsWith(requiredPrefix)
    ? pathname
    : `${requiredPrefix}${pathname}`;

  // Allow auth routes through without role check
  if (pathname.startsWith("/auth")) return response;

  // ── Not signed in → redirect to login ────────────────────────────────────
  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Rewrite to portal route group ─────────────────────────────────────────
  if (rewrittenPath !== pathname) {
    const rewritten = NextResponse.rewrite(
      new URL(rewrittenPath, request.url)
    );
    // Copy session cookies
    response.cookies.getAll().forEach((cookie) => {
      rewritten.cookies.set(cookie.name, cookie.value);
    });
    return rewritten;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp|webmanifest|txt|xml|woff|woff2)$).*)",
  ],
};
