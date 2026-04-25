import type { ContentPostStatus } from "@/lib/content-posts/status";

export type { ContentPostStatus };

/** App-supported social targets (Buffer + generation). */
export type TargetPlatform = "linkedin" | "instagram";

/** Mirrors review_verdict enum */
export type ReviewVerdict = "approve" | "revise" | "reject";

/**
 * `content_posts` row — brief + generated copy on the same row.
 * X/Twitter field mapping removed 2026-04-25; `x_*` columns may still exist in Supabase.
 */
export interface ContentRequest {
  id: string;
  topic: string;
  audience: string;
  content_type: string;
  /** Stored as `content_posts.platforms` (text[]). */
  platforms: string[];
  status: ContentPostStatus;
  created_at: string;
  updated_at: string;

  linkedin_hook: string | null;
  linkedin_post: string | null;
  linkedin_cta: string | null;
  instagram_hook: string | null;
  instagram_caption: string | null;
  instagram_cta: string | null;
  hashtags: string[] | null;

  linkedin_image_url: string | null;
  instagram_image_url: string | null;
}

export interface ContentReview {
  id: string;
  /** Parent post id (`content_reviews.content_request_id` in DB when unchanged). */
  post_id: string;
  generated_content_id: string | null;
  overall_score: string | number | null;
  brand_alignment_score: string | number | null;
  clarity_score: string | number | null;
  quality_verdict: ReviewVerdict | string;
  problems_found: unknown;
  specific_fixes: unknown;
  revised_suggestions: Record<string, unknown> | null;
  raw_response: Record<string, unknown> | null;
  reviewed_by_model: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublishLog {
  id: string;
  /** Parent post id (`publish_logs.content_request_id` in DB when unchanged). */
  post_id: string;
  generated_content_id: string | null;
  platform: TargetPlatform | string;
  provider: string;
  provider_post_id: string | null;
  channel_id: string | null;
  posted_text: string | null;
  status: string;
  error_message: string | null;
  provider_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  topic?: string | null;
}

/** `buffer_x_profile_id` may still exist in DB; app no longer reads it (X removed 2026-04-25). */
export interface AppSettings {
  id: number;
  brand_name: string | null;
  brand_tone: string | null;
  banned_phrases: string[] | unknown | null;
  review_strictness: number | null;
  buffer_linkedin_profile_id: string | null;
  buffer_instagram_profile_id: string | null;
  created_at: string;
  updated_at: string;
}
