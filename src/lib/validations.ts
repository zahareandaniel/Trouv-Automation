import { z } from "zod";

export { contentPostStatusSchema } from "@/lib/content-posts/status";

export const targetPlatformSchema = z.enum(["linkedin", "instagram", "x"]);

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createIdeaBodySchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  audience: z.string().min(1, "Audience is required"),
  content_type: z.string().min(1, "Content type is required"),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
});

export const updateIdeaBodySchema = z.object({
  topic: z.string().min(1).optional(),
  audience: z.string().min(1).optional(),
  content_type: z.string().min(1).optional(),
  platforms: z.array(z.string()).min(1).optional(),
});

export const generateBodySchema = z.object({
  contentRequestId: z.uuid(),
});

export const reviewBodySchema = z.object({
  contentRequestId: z.uuid(),
});

export const bufferPostBodySchema = z.object({
  platform: targetPlatformSchema,
  text: z.string().min(1).max(20_000),
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
  x_hook: z.string(),
  x_post: z.string(),
  x_cta: z.string(),
  hashtags: z.array(z.string()),
});

const VALID_VERDICTS = ["approve", "revise", "reject"] as const;

const normalizeVerdict = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const lower = v.trim().toLowerCase();
  if (VALID_VERDICTS.includes(lower as (typeof VALID_VERDICTS)[number])) return lower;
  for (const vv of VALID_VERDICTS) {
    if (lower.startsWith(vv)) return vv;
  }
  return lower;
}, z.enum(VALID_VERDICTS));

export const reviewOutputSchema = z.object({
  overall_score: z.number(),
  brand_alignment_score: z.number(),
  clarity_score: z.number(),
  quality_verdict: normalizeVerdict,
  problems_found: z.array(z.string()),
  specific_fixes: z.array(z.string()),
  revised_suggestions: z.object({
    linkedin: z.string(),
    instagram: z.string(),
    x: z.string(),
  }),
});

export type GenerationOutput = z.infer<typeof generationOutputSchema>;
export type ReviewOutput = z.infer<typeof reviewOutputSchema>;
