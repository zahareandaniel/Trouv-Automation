import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
export { emailsMatch, passwordMatches } from "@/lib/auth/password";

function secretKey() {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_JWT_SECRET must be set (min 16 characters)");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(email: string) {
  return new SignJWT({ sub: email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE_NAME);
}

export async function getSessionEmail(): Promise<string | null> {
  const c = await cookies();
  const t = c.get(SESSION_COOKIE_NAME)?.value;
  if (!t) return null;
  return verifySessionToken(t);
}

export function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || password === undefined || password === "") {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  }
  return { email, password };
}
