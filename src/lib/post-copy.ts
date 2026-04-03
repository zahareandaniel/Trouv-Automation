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
