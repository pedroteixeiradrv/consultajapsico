import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware placeholder — auth real (Supabase / cookies) na próxima fase.
 * Por ora apenas passa adiante; rotas /admin, /psych, /client serão protegidas depois.
 * Sem fluxo anônimo (anon removido do MVP).
 */
export function middleware(_request: NextRequest) {
  // TODO: validar sessão admin | psych | client (sem anon)
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
