/** Mirrors DB enums on content_posts.status */
export type ContentStatus =
  | "draft"
  | "generated"
  | "reviewed"
  | "approved"
  | "queued"
  | "published"
  | "failed"
  | "archived";

/** Mirrors target_platform enum */
export type TargetPlatform = "linkedin" | "instagram" | "x";

/** Mirrors review_verdict enum */
export type ReviewVerdict = "approve" | "revise" | "reject";

export interface ContentRequest {
  id: string;
  topic: string;
  audience: string;
  content_type: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

export interface ContentRequestPlatform {
  id: string;
  content_request_id: string;
  platform: TargetPlatform;
  created_at: string;
}

export interface GeneratedContent {
  id: string;
  content_request_id: string;
  linkedin_hook: string | null;
  linkedin_post: string | null;
  linkedin_cta: string | null;
  instagram_hook: string | null;
  instagram_caption: string | null;
  instagram_cta: string | null;
  x_hook: string | null;
  x_post: string | null;
  x_cta: string | null;
  hashtags: string[] | null;
  internal_notes: string | null;
  raw_response: Record<string, unknown> | null;
  created_by_model: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentReview {
  id: string;
  content_request_id: string;
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
  content_request_id: string;
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

export interface AppSettings {
  id: number;
  brand_name: string | null;
  brand_tone: string | null;
  banned_phrases: string[] | unknown | null;
  review_strictness: number | null;
  buffer_linkedin_profile_id: string | null;
  buffer_instagram_profile_id: string | null;
  buffer_x_profile_id: string | null;
  created_at: string;
  updated_at: string;
}
