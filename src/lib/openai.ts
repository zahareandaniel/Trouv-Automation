import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AppSettings } from "@/lib/types";
import type { TargetPlatform } from "@/lib/types";
import {
  generationOutputSchema,
  reviewOutputSchema,
  type GenerationOutput,
  type ReviewOutput,
} from "@/lib/validations";

function bannedList(settings: AppSettings | null): string[] {
  const b = settings?.banned_phrases;
  if (Array.isArray(b)) return b.filter((x): x is string => typeof x === "string");
  return [];
}

export async function generateSocialCopy(input: {
  topic: string;
  audience: string;
  content_type: string;
  platforms: TargetPlatform[];
  settings: AppSettings | null;
  reviewFeedback?: {
    problems_found: string[];
    specific_fixes: string[];
  } | null;
}): Promise<{ output: GenerationOutput; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model =
    process.env.OPENAI_DEFAULT_MODEL?.trim() || "gpt-4o-mini";

  const banned = bannedList(input.settings);
  const brandName = input.settings?.brand_name ?? "Trouv Chauffeurs";
  const brandTone =
    input.settings?.brand_tone ??
    "premium, discreet, corporate, operationally credible, EA/PA friendly";

  const feedbackBlock =
    input.reviewFeedback?.problems_found?.length ||
    input.reviewFeedback?.specific_fixes?.length
      ? `\n\nPREVIOUS REVIEW FEEDBACK — address all of these in this generation:
Problems: ${(input.reviewFeedback.problems_found ?? []).join("; ") || "none"}
Required fixes: ${(input.reviewFeedback.specific_fixes ?? []).join("; ") || "none"}`
      : "";

  const system = `You write social copy for ${brandName} (premium London chauffeur / corporate travel).

Voice: ${brandTone}
Never: hype, childish tone, generic luxury filler, emojis unless the brief explicitly asks, exaggerated claims, startup jargon.

Target platforms for this brief: ${input.platforms.join(", ")}.
For each target platform, write a strong hook (opening line), body copy, and CTA.
For platforms NOT in the target list, use empty strings.

Banned phrases (do not use): ${banned.length ? banned.join("; ") : "(none configured)"}${feedbackBlock}

Return JSON only with exactly these keys:
linkedin_hook, linkedin_post, linkedin_cta,
instagram_hook, instagram_caption, instagram_cta,
x_hook, x_post, x_cta,
hashtags (array of strings, no leading #)`;

  const user = JSON.stringify({
    topic: input.topic,
    audience: input.audience,
    content_type: input.content_type,
    brand_name: brandName,
    brand_tone: brandTone,
  });

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.55,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI response");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("OpenAI returned invalid JSON");
  }

  const out = generationOutputSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error(
      out.error.issues.map((i) => i.message).join("; "),
    );
  }
  return { output: out.data, model };
}

export async function reviewGeneratedCopy(input: {
  topic: string;
  audience: string;
  content_type: string;
  generated: GenerationOutput;
  settings: AppSettings | null;
}): Promise<{ output: ReviewOutput; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const model =
    process.env.ANTHROPIC_REVIEW_MODEL?.trim() || "claude-sonnet-4-20250514";

  const strict = input.settings?.review_strictness ?? 50;
  const banned = bannedList(input.settings);
  const brandName = input.settings?.brand_name ?? "Trouv Chauffeurs";
  const brandTone =
    input.settings?.brand_tone ??
    "premium, discreet, corporate, operationally credible";

  let strictnessGuide: string;
  if (strict <= 20) {
    strictnessGuide = `Strictness is ${strict}/100 (very lenient). Approve unless the copy is factually wrong, off-brand, or embarrassingly bad. Minor imperfections are acceptable. Scores should generally be 75+.`;
  } else if (strict <= 50) {
    strictnessGuide = `Strictness is ${strict}/100 (moderate). Approve if the copy is on-brand and reasonably polished. Flag obvious issues but don't nitpick.`;
  } else if (strict <= 75) {
    strictnessGuide = `Strictness is ${strict}/100 (strict). Expect polished, publication-ready copy. Flag tone issues, weak CTAs, and unclear messaging.`;
  } else {
    strictnessGuide = `Strictness is ${strict}/100 (very strict). Only approve exceptional copy. Demand specific, compelling hooks, strong CTAs, and perfect brand alignment.`;
  }

  const system = `You are a senior editorial QA reviewer for ${brandName}.

Brand tone: ${brandTone}
${strictnessGuide}
Banned phrases: ${banned.length ? banned.join("; ") : "none"}

Score the draft copy (0-100) for overall quality, brand alignment, and clarity.
quality_verdict must be exactly one of: approve, revise, reject

You MUST respond with valid JSON only — no markdown, no code fences, no explanation.
{
  "overall_score": number,
  "brand_alignment_score": number,
  "clarity_score": number,
  "quality_verdict": "approve" | "revise" | "reject",
  "problems_found": string[],
  "specific_fixes": string[],
  "revised_suggestions": { "linkedin": string, "instagram": string, "x": string }
}`;

  const userMsg = JSON.stringify({
    brief: {
      topic: input.topic,
      audience: input.audience,
      content_type: input.content_type,
    },
    draft: input.generated,
  });

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userMsg }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  const raw = textBlock?.text;
  if (!raw) throw new Error("Empty Claude review response");

  let parsed: unknown;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON object");
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("Claude review response was not valid JSON");
  }

  const out = reviewOutputSchema.safeParse(parsed);
  if (!out.success) {
    throw new Error(out.error.issues.map((i) => i.message).join("; "));
  }
  return { output: out.data, model };
}
