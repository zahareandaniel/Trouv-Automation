import type { TargetPlatform } from "@/lib/types";

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
    case "x":
      return [post.x_hook, post.x_post, post.x_cta]
        .filter(Boolean)
        .join("\n\n");
  }
}
