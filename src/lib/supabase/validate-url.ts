/**
 * Catches a common misconfiguration: Supabase API URL must use *.supabase.co
 * (copy from Dashboard → Project Settings → API), not *.supabase.com.
 */
export function assertLikelySupabaseUrl(url: string): void {
  const u = url.toLowerCase();
  if (u.includes("supabase.com") && !u.includes("supabase.co")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL should be https://<project-ref>.supabase.co (letter o in .co). Copy it from Supabase → Project Settings → API — not .supabase.com.",
    );
  }
  if (!u.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must start with https://",
    );
  }
}

export function hintForFetchFailure(baseMessage: string): string {
  if (!baseMessage.toLowerCase().includes("fetch failed")) {
    return baseMessage;
  }
  return [
    baseMessage,
    "",
    "Network reachability to Supabase failed. Check:",
    "• Vercel → Settings → Environment Variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY match Supabase → Project Settings → API (re‑paste, no spaces).",
    "• URL must be https://…supabase.co (not .com).",
    "• Supabase project is not paused (Dashboard → project status).",
    "• Redeploy after changing env vars.",
  ].join("\n");
}
