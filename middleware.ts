import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "cj_session";

function secretKey() {
  const secret =
    process.env.SESSION_SECRET ||
    "consultaja-local-demo-secret-change-me-in-prod";
  return new TextEncoder().encode(secret);
}

async function readRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Auth gate — no anonymous patient flow.
 * Public: /, /sac, register/login/setup pages.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await readRole(request);

  const isAdminPublic =
    pathname === "/admin/login" || pathname === "/admin/setup";
  const isPsychPublic =
    pathname === "/psych/login" || pathname === "/psych/register";
  const isClientPublic =
    pathname === "/client/login" || pathname === "/client/register";

  if (pathname.startsWith("/admin") && !isAdminPublic) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/psych") && !isPsychPublic) {
    if (role !== "psych") {
      return NextResponse.redirect(new URL("/psych/login", request.url));
    }
  }

  if (pathname.startsWith("/client") && !isClientPublic) {
    if (role !== "client") {
      return NextResponse.redirect(new URL("/client/login", request.url));
    }
  }

  if (pathname.startsWith("/standby") || pathname.startsWith("/call")) {
    if (!role) {
      return NextResponse.redirect(new URL("/client/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/psych/:path*",
    "/client/:path*",
    "/standby/:path*",
    "/call/:path*",
  ],
};
