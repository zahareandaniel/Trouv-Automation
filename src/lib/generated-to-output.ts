import type { GeneratedContent } from "@/lib/types";
import type { GenerationOutput } from "@/lib/validations";

export function generatedRowToOutput(g: GeneratedContent): GenerationOutput {
  return {
    linkedin_hook: g.linkedin_hook ?? "",
    linkedin_post: g.linkedin_post ?? "",
    linkedin_cta: g.linkedin_cta ?? "",
    instagram_hook: g.instagram_hook ?? "",
    instagram_caption: g.instagram_caption ?? "",
    instagram_cta: g.instagram_cta ?? "",
    x_hook: g.x_hook ?? "",
    x_post: g.x_post ?? "",
    x_cta: g.x_cta ?? "",
    hashtags: g.hashtags ?? [],
  };
}
