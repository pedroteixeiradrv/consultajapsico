import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role, SessionPayload } from "@/lib/types";

export const SESSION_COOKIE = "cj_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret =
    process.env.SESSION_SECRET ||
    "consultaja-local-demo-secret-change-me-in-prod";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({
    role: payload.role,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role as Role | undefined;
    const sub = payload.sub;
    const email = payload.email as string | undefined;
    if (!role || !sub || !email) return null;
    if (role !== "admin" && role !== "psych" && role !== "client") return null;
    return { role, sub, email };
  } catch {
    return null;
  }
}

export async function setSession(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(role?: Role): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Não autenticado");
  if (role && session.role !== role) throw new Error("Acesso negado");
  return session;
}
