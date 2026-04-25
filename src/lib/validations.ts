import { z } from "zod";

export { contentPostStatusSchema } from "@/lib/content-posts/status";

export const targetPlatformSchema = z.enum(["linkedin", "instagram"]);

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createIdeaBodySchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  audience: z.string().min(1, "Audience is required"),
  content_type: z.string().min(1, "Content type is required"),
  platforms: z.array(targetPlatformSchema).min(1, "Select at least one platform"),
});

export const updateIdeaBodySchema = z.object({
  topic: z.string().min(1).optional(),
  audience: z.string().min(1).optional(),
  content_type: z.string().min(1).optional(),
  platforms: z.array(targetPlatformSchema).min(1).optional(),
});

export const generateBodySchema = z.object({
  contentRequestId: z.uuid(),
});

export const reviewBodySchema = z.object({
  contentRequestId: z.uuid(),
});

export const bufferPostBodySchema = z.object({
  platform: targetPlatformSchema,
  /** Ignored — copy is always taken from `content_posts` for consistency. */
  text: z.string().max(20_000).optional(),
  contentRequestId: z.uuid(),
});

export const settingsPatchSchema = z.object({
  brand_name: z.string().min(1).optional(),
  brand_tone: z.string().nullable().optional(),
  review_strictness: z.number().int().min(0).max(100).optional(),
});

export const generationOutputSchema = z.object({
  linkedin_hook: z.string(),
  linkedin_post: z.string(),
  linkedin_cta: z.string(),
  instagram_hook: z.string(),
  instagram_caption: z.string(),
  instagram_cta: z.string(),
  hashtags: z.array(z.string()),
});

/** Same shape as AI output — full replace when editing copy after approval. */
export const replacePostCopyBodySchema = generationOutputSchema;

const qualityVerdict = z.preprocess(
  (val) => {
    if (typeof val !== "string") return val;
    const normalized = val.toLowerCase().trim();
    if (normalized === "approved" || normalized === "approve") return "approve";
    if (normalized === "revised" || normalized === "revise" || normalized === "needs revision")
      return "revise";
    if (normalized === "rejected" || normalized === "reject") return "reject";
    return normalized;
  },
  z.enum(["approve", "revise", "reject"]),
);

export const reviewOutputSchema = z.object({
  overall_score: z.number(),
  brand_alignment_score: z.number(),
  clarity_score: z.number(),
  quality_verdict: qualityVerdict,
  problems_found: z.array(z.string()),
  specific_fixes: z.array(z.string()),
  revised_suggestions: z.object({
    linkedin: z.string(),
    instagram: z.string(),
  }),
});

export type GenerationOutput = z.infer<typeof generationOutputSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
