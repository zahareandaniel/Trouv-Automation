import { platformsFromDb } from "@/lib/platforms";
import type {
  AppSettings,
  ContentRequest,
  ContentReview,
  GeneratedContent,
} from "@/lib/types";

export function mapRequest(r: Record<string, unknown>): ContentRequest {
  return {
    id: String(r.id),
    topic: String(r.topic ?? ""),
    audience: String(r.audience ?? ""),
    content_type: String(r.content_type ?? ""),
    platforms: platformsFromDb(r.platforms),
    status: r.status as ContentRequest["status"],
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export function mapGenerated(r: Record<string, unknown>): GeneratedContent {
  const tags = r.hashtags;
  return {
    id: String(r.id),
    content_request_id: String(r.content_request_id ?? ""),
    linkedin_hook: r.linkedin_hook != null ? String(r.linkedin_hook) : null,
    linkedin_post: r.linkedin_post != null ? String(r.linkedin_post) : null,
    linkedin_cta: r.linkedin_cta != null ? String(r.linkedin_cta) : null,
    instagram_hook: r.instagram_hook != null ? String(r.instagram_hook) : null,
    instagram_caption:
      r.instagram_caption != null ? String(r.instagram_caption) : null,
    instagram_cta: r.instagram_cta != null ? String(r.instagram_cta) : null,
    x_hook: r.x_hook != null ? String(r.x_hook) : null,
    x_post: r.x_post != null ? String(r.x_post) : null,
    x_cta: r.x_cta != null ? String(r.x_cta) : null,
    hashtags: Array.isArray(tags)
      ? tags.filter((x): x is string => typeof x === "string")
      : null,
    internal_notes: r.internal_notes != null ? String(r.internal_notes) : null,
    raw_response:
      r.raw_response && typeof r.raw_response === "object"
        ? (r.raw_response as Record<string, unknown>)
        : null,
    created_by_model:
      r.created_by_model != null ? String(r.created_by_model) : null,
    is_active: Boolean(r.is_active),
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export function mapReview(r: Record<string, unknown>): ContentReview {
  return {
    id: String(r.id),
    content_request_id: String(r.content_request_id ?? ""),
    generated_content_id:
      r.generated_content_id != null ? String(r.generated_content_id) : null,
    overall_score: r.overall_score as string | number | null,
    brand_alignment_score: r.brand_alignment_score as string | number | null,
    clarity_score: r.clarity_score as string | number | null,
    quality_verdict: String(r.quality_verdict ?? ""),
    problems_found: r.problems_found,
    specific_fixes: r.specific_fixes,
    revised_suggestions:
      r.revised_suggestions && typeof r.revised_suggestions === "object"
        ? (r.revised_suggestions as Record<string, unknown>)
        : null,
    raw_response:
      r.raw_response && typeof r.raw_response === "object"
        ? (r.raw_response as Record<string, unknown>)
        : null,
    reviewed_by_model:
      r.reviewed_by_model != null ? String(r.reviewed_by_model) : null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

export function mapSettings(r: Record<string, unknown>): AppSettings {
  const bp = r.banned_phrases;
  return {
    id: Number(r.id),
    brand_name: r.brand_name != null ? String(r.brand_name) : null,
    brand_tone: r.brand_tone != null ? String(r.brand_tone) : null,
    banned_phrases: bp,
    review_strictness:
      r.review_strictness != null ? Number(r.review_strictness) : null,
    buffer_linkedin_profile_id:
      r.buffer_linkedin_profile_id != null
        ? String(r.buffer_linkedin_profile_id)
        : null,
    buffer_instagram_profile_id:
      r.buffer_instagram_profile_id != null
        ? String(r.buffer_instagram_profile_id)
        : null,
    buffer_x_profile_id:
      r.buffer_x_profile_id != null ? String(r.buffer_x_profile_id) : null,
    created_at: String(r.created_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
  };
}

