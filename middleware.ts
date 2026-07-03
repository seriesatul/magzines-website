import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

function isAdminRole(role: unknown): boolean {
  return typeof role === "string" && ADMIN_ROLES.has(role);
}

function buildAdminSignInUrl(request: NextRequest): URL {
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("mode", "admin");
  signInUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  return signInUrl;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    ...(process.env.AUTH_SECRET ? { secret: process.env.AUTH_SECRET } : {})
  });
  const isAdmin = isAdminRole(token?.role);

  if (pathname.startsWith("/api/admin")) {
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin credentials are required." }, { status: 401 });
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      return NextResponse.redirect(buildAdminSignInUrl(request));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  if (isAdmin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt)$).*)"
  ]
};
