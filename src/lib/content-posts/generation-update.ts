import type { GenerationOutput } from "@/lib/validations";
import { STATUS_DRAFT } from "@/lib/content-posts/status";

/**
 * Columns we persist after OpenAI generation. Keep aligned with your real `content_posts`
 * table — production DBs often omit hooks, CTAs, and `hashtags` until those columns exist.
 * Add keys here when you add columns in Supabase.
 */
export const CONTENT_POSTS_GENERATION_WRITE_KEYS = [
  "linkedin_post",
  "instagram_caption",
  "x_post",
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
