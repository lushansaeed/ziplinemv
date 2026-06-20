import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessRole, getUserRole, type AuthRole } from "@/lib/auth/roles";

const protectedRoutes: { prefix: string; roles: AuthRole[]; loginRole: AuthRole }[] = [
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

  const {
    data: { user }
  } = await supabase.auth.getUser();

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
