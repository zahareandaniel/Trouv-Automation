import type { GenerationOutput } from "@/lib/validations";
import type { TargetPlatform } from "@/lib/types";

/** Twitter / X single-post cap (grapheme / weighted units — we stay strictly under). */
export const X_POST_MAX_CHARS = 280;

const ELLIPSIS = "…";

function graphemeSegments(text: string): string[] {
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  return [...seg.segment(text)].map((s) => s.segment);
}

function graphemeCount(text: string): number {
  return graphemeSegments(text).length;
}

/**
 * Whether assembled X fields exceed the publish grapheme limit (same rules as {@link truncateForX}).
 * Does not modify text. Used to reject over-limit generations instead of truncating silently.
 */
export function assembledXExceedsGraphemeLimit(
  output: Pick<
    GenerationOutput,
    "x_hook" | "x_post" | "x_cta"
  >,
): boolean {
  const t = [output.x_hook, output.x_post, output.x_cta]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
  if (!t) return false;
  const hasUrl = /https?:\/\/\S+/i.test(t);
  const target = hasUrl ? Math.min(X_POST_MAX_CHARS, 268) : X_POST_MAX_CHARS;
  return graphemeCount(t) > target;
}

/**
 * Trims to at most `max` grapheme clusters (not UTF-16 code units), which matches
 * how X counts more closely than `String.length`. Also uses a slightly lower target
 * when the post contains URLs, because X counts each link as ~23 chars regardless of length.
 */
export function truncateForX(text: string, max = X_POST_MAX_CHARS): string {
  const t = text.trim();
  const hasUrl = /https?:\/\/\S+/i.test(t);
  const target = hasUrl ? Math.min(max, 268) : max;

  if (graphemeCount(t) <= target) return t;

  const ellG = graphemeCount(ELLIPSIS);
  let take = Math.max(1, target - ellG); // reserve ellipsis within Twitter cap
  const segs = graphemeSegments(t);
  let cut = segs.slice(0, take).join("");

  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0 && take >= 40) {
    const shorter = cut.slice(0, lastSpace).trimEnd();
    if (graphemeCount(shorter) + ellG <= target && shorter.length > 0) {
      cut = shorter;
    }
  }

  cut = cut.trimEnd();
  while (graphemeCount(cut) + ellG > target && cut.length > 0) {
    const g = graphemeSegments(cut);
    if (g.length === 0) break;
    g.pop();
    cut = g.join("");
  }

  return cut + ELLIPSIS;
}

type PostFields = {
  linkedin_hook?: string | null;
  linkedin_post?: string | null;
  linkedin_cta?: string | null;
  instagram_hook?: string | null;
  instagram_caption?: string | null;
  instagram_cta?: string | null;
  x_hook?: string | null;
  x_post?: string | null;
  x_cta?: string | null;
};

/** Assembles the full post text for a given platform. */
export function textForPlatform(post: PostFields, p: TargetPlatform): string {
  switch (p) {
    case "linkedin":
      return [post.linkedin_hook, post.linkedin_post, post.linkedin_cta]
        .filter(Boolean)
        .join("\n\n");
    case "instagram":
      return [post.instagram_hook, post.instagram_caption, post.instagram_cta]
        .filter(Boolean)
        .join("\n\n");
    case "x": {
      const raw = [post.x_hook, post.x_post, post.x_cta]
        .filter(Boolean)
        .join("\n\n");
      return truncateForX(raw);
    }
  }
}
