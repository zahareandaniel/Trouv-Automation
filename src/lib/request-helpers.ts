import type { TargetPlatform } from "@/lib/types";

export function envChannelId(platform: TargetPlatform): string {
  const m: Record<TargetPlatform, string | undefined> = {
    linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID?.trim(),
    instagram: process.env.BUFFER_INSTAGRAM_PROFILE_ID?.trim(),
    x: process.env.BUFFER_X_PROFILE_ID?.trim(),
  };
  return m[platform] ?? "";
}
