import type { SupabaseClient } from "@supabase/supabase-js";
import type { TargetPlatform } from "@/lib/types";

export async function loadPlatforms(
  supabase: SupabaseClient,
  contentRequestId: string,
): Promise<TargetPlatform[]> {
  const { data, error } = await supabase
    .from("content_request_platforms")
    .select("platform")
    .eq("content_request_id", contentRequestId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.platform as TargetPlatform);
}

export function envChannelId(platform: TargetPlatform): string {
  const m: Record<TargetPlatform, string | undefined> = {
    linkedin: process.env.BUFFER_LINKEDIN_PROFILE_ID?.trim(),
    instagram: process.env.BUFFER_INSTAGRAM_PROFILE_ID?.trim(),
    x: process.env.BUFFER_X_PROFILE_ID?.trim(),
  };
  return m[platform] ?? "";
}
