import type { ContentRequest } from "@/lib/types";
import type { GenerationOutput } from "@/lib/validations";

/** Build OpenAI review input from `content_posts` copy fields. */
export function postCopyToGenerationOutput(post: ContentRequest): GenerationOutput {
  return {
    linkedin_hook: post.linkedin_hook ?? "",
    linkedin_post: post.linkedin_post ?? "",
    linkedin_cta: post.linkedin_cta ?? "",
    instagram_hook: post.instagram_hook ?? "",
    instagram_caption: post.instagram_caption ?? "",
    instagram_cta: post.instagram_cta ?? "",
    x_hook: post.x_hook ?? "",
    x_post: post.x_post ?? "",
    x_cta: post.x_cta ?? "",
    hashtags: post.hashtags ?? [],
  };
}
