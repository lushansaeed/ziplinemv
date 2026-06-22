import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type AuthRole = "admin" | "counter_staff" | "launching_staff" | "landing_staff" | "agent" | "affiliate";
type AuthUser = {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

function isAuthRole(value: unknown): value is AuthRole {
  return value === "admin" || value === "counter_staff" || value === "launching_staff" || value === "landing_staff" || value === "agent" || value === "affiliate";
}

function getUserRole(user: AuthUser | null): AuthRole | null {
  const role = user?.app_metadata?.role;
  return isAuthRole(role) ? role : null;
}

function canAccessRole(userRole: AuthRole | null, allowedRoles: AuthRole[]) {
  return userRole !== null && allowedRoles.includes(userRole);
}

const protectedRoutes: { prefix: string; roles: AuthRole[]; loginRole: AuthRole }[] = [
  { prefix: "/admin/settings", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/pricing", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/theme", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/roles", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/agents", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/affiliates", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/reports", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/commissions", roles: ["admin"], loginRole: "admin" },
  { prefix: "/admin/customers", roles: ["admin", "counter_staff"], loginRole: "admin" },
  { prefix: "/admin/media", roles: ["admin", "launching_staff"], loginRole: "admin" },
  { prefix: "/admin/bookings", roles: ["admin", "counter_staff", "launching_staff", "landing_staff"], loginRole: "admin" },
  { prefix: "/admin", roles: ["admin"], loginRole: "admin" },
  { prefix: "/agents/dashboard", roles: ["agent", "admin"], loginRole: "agent" },
  { prefix: "/affiliates/dashboard", roles: ["affiliate", "admin"], loginRole: "affiliate" }
];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const auth = supabase.auth as unknown as {
    getUser: () => Promise<{ data: { user: AuthUser | null } }>;
  };
  const {
    data: { user }
  } = await auth.getUser();

  const matchedRoute = protectedRoutes.find((route) => request.nextUrl.pathname.startsWith(route.prefix));

  if (!matchedRoute) {
    return response;
  }

  if (!canAccessRole(getUserRole(user), matchedRoute.roles)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("role", matchedRoute.loginRole);
    url.searchParams.set("redirectTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);

    if (user) {
      url.searchParams.set("error", "This account does not have access to that portal.");
    }

    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/agents/dashboard/:path*", "/affiliates/dashboard/:path*"]
};
