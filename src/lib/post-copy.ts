import { STATUS_DRAFT, STATUS_IDEA } from "@/lib/content-posts/status";
import type { ContentRequest } from "@/lib/types";

/** True if the post row has any non-empty generated copy fields. */
export function postHasGeneratedCopy(p: ContentRequest): boolean {
  const parts = [
    p.linkedin_hook,
    p.linkedin_post,
    p.linkedin_cta,
    p.instagram_hook,
    p.instagram_caption,
    p.instagram_cta,
    p.x_hook,
    p.x_post,
    p.x_cta,
  ];
  return parts.some((x) => x != null && String(x).trim() !== "");
}

/**
 * Editable on `/ideas/[id]`: `idea`, or legacy `draft` rows with no copy yet
 * (before enum migration, briefs were often `draft`).
 */
export function isContentPostBriefStage(p: ContentRequest): boolean {
  if (p.status === STATUS_IDEA) return true;
  if (p.status === STATUS_DRAFT && !postHasGeneratedCopy(p)) return true;
  return false;
}
