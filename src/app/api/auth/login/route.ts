import { NextResponse } from "next/server";
import {
  emailsMatch,
  getAdminCredentials,
  passwordMatches,
  setSessionCookie,
  signSessionToken,
} from "@/lib/auth";
import { loginBodySchema } from "@/lib/validations";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  try {
    const admin = getAdminCredentials();
    if (
      !emailsMatch(parsed.data.email, admin.email) ||
      !passwordMatches(admin.password, parsed.data.password)
    ) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const token = await signSessionToken(admin.email);
    await setSessionCookie(token);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
