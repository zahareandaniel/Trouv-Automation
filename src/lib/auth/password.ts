import { timingSafeEqual } from "crypto";

export function emailsMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function passwordMatches(expected: string, provided: string) {
  const e = Buffer.from(expected, "utf8");
  const p = Buffer.from(provided, "utf8");
  if (e.length !== p.length) return false;
  return timingSafeEqual(e, p);
}
