import { platformsFromDb } from "@/lib/platforms";
import type {
  AppSettings,
  ContentRequest,
  ContentReview,
} from "@/lib/types";

function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function hashtagsFromRow(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const t = v.filter((x): x is string => typeof x === "string");
  return t.length ? t : null;
}

/** Map copy + image fields shared on `content_posts`. */
export function mapPostCopyFields(r: Record<string, unknown>): Pick<
  ContentRequest,
  | "linkedin_hook"
  | "linkedin_post"
  | "linkedin_cta"
  | "instagram_hook"
  | "instagram_caption"
  | "instagram_cta"
  | "x_hook"
  | "x_post"
  | "x_cta"
  | "hashtags"
  | "linkedin_image_url"
  | "instagram_image_url"
  | "x_image_url"
> {
  return {
    linkedin_hook: strOrNull(r.linkedin_hook),
    linkedin_post: strOrNull(r.linkedin_post),
    linkedin_cta: strOrNull(r.linkedin_cta),
    instagram_hook: strOrNull(r.instagram_hook),
    instagram_caption: strOrNull(r.instagram_caption),
    instagram_cta: strOrNull(r.instagram_cta),
    x_hook: strOrNull(r.x_hook),
    x_post: strOrNull(r.x_post),
    x_cta: strOrNull(r.x_cta),
    hashtags: hashtagsFromRow(r.hashtags),
    linkedin_image_url: strOrNull(r.linkedin_image_url),
    instagram_image_url: strOrNull(r.instagram_image_url),
    x_image_url: strOrNull(r.x_image_url),
  };
}

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
    ...mapPostCopyFields(r),
  };
}

export function mapReview(r: Record<string, unknown>): ContentReview {
  const postId =
    r.content_post_id != null
      ? String(r.content_post_id)
      : String(r.content_request_id ?? "");
  return {
    id: String(r.id),
    post_id: postId,
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
