import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ─── Domain → route prefix mapping ──────────────────────────────────────────
const DOMAIN_MAP: Record<string, string> = {
  "admin.zipline.mv":     "/admin",
  "agents.zipline.mv":    "/agents",
  "affiliate.zipline.mv": "/affiliate",
};

// ─── Role → allowed route prefixes ──────────────────────────────────────────
const ROLE_ROUTES: Record<string, string[]> = {
  SUPER_ADMIN:         ["/admin", "/agents", "/affiliate"],
  ADMIN:               ["/admin"],
  OPERATIONS_MANAGER:  ["/admin"],
  BOOKING_STAFF:       ["/admin"],
  MEDIA_STAFF:         ["/admin"],
  FINANCE:             ["/admin"],
  AGENT:               ["/agents"],
  AFFILIATE:           ["/affiliate"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";

  // ── Refresh Supabase session ──────────────────────────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // ── Role-based access control ─────────────────────────────────────────────
  const userRole = (user.user_metadata?.role as string) ?? "";
  const allowedPrefixes = ROLE_ROUTES[userRole] ?? [];

  if (!allowedPrefixes.some((p) => rewrittenPath.startsWith(p))) {
    // Redirect to the correct portal home for their role
    const defaultPath = allowedPrefixes[0] ?? "/";
    return NextResponse.redirect(new URL(defaultPath, request.url));
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
