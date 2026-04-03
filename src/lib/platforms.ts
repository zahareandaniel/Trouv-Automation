import type { TargetPlatform } from "@/lib/types";

const KNOWN: readonly TargetPlatform[] = ["linkedin", "instagram", "x"];
const KNOWN_SET = new Set<string>(KNOWN);

/** Normalize Postgres `text[]` / JSON array to plain strings. */
export function platformsFromDb(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** Subset of DB strings that match app-supported Buffer/OpenAI platforms. */
export function targetPlatformsFromStrings(platforms: string[]): TargetPlatform[] {
  return platforms.filter((p): p is TargetPlatform => KNOWN_SET.has(p));
}

export function targetPlatformsFromDb(value: unknown): TargetPlatform[] {
  return targetPlatformsFromStrings(platformsFromDb(value));
}
