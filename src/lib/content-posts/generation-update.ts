import type { GenerationOutput } from "@/lib/validations";
import { STATUS_DRAFT } from "@/lib/content-posts/status";

/**
 * Columns we persist after AI generation (Claude for copy).
 * Must match real `content_posts` columns in Supabase.
 */
export const CONTENT_POSTS_GENERATION_WRITE_KEYS = [
  "linkedin_hook",
  "linkedin_post",
  "linkedin_cta",
  "instagram_hook",
  "instagram_caption",
  "instagram_cta",
  "x_hook",
  "x_post",
  "x_cta",
  "hashtags",
] as const;

type GenerationWriteKey = (typeof CONTENT_POSTS_GENERATION_WRITE_KEYS)[number];

/**
 * Build a Supabase-safe `update` payload: only known columns + status → `draft`.
 */
export function buildContentPostGenerationPatch(
  output: GenerationOutput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    status: STATUS_DRAFT,
  };
  for (const key of CONTENT_POSTS_GENERATION_WRITE_KEYS) {
    patch[key] = output[key];
  }
  return patch;
}
