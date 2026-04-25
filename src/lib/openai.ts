import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ZodError } from "zod";
import type { AppSettings } from "@/lib/types";
import type { TargetPlatform } from "@/lib/types";
import {
  generationOutputSchema,
  reviewOutputSchema,
  type GenerationOutput,
  type ReviewOutput,
} from "@/lib/validations";
import { generateSocialPost } from "@/lib/generators/claude-writer";
import {
  TROUV_COPY_PLAYBOOK,
  TROUV_REVIEW_RUBRIC,
} from "@/lib/trouv-copy-playbook";

const LOG_RAW_MAX = 2000;

function zodFailureIssues(err: unknown): ZodError["issues"] | null {
  return err instanceof ZodError ? err.issues : null;
}

function bannedList(settings: AppSettings | null): string[] {
  const b = settings?.banned_phrases;
  if (Array.isArray(b)) return b.filter((x): x is string => typeof x === "string");
  return [];
}

export async function generateIdeaBrief(
  settings: AppSettings | null,
  recentTopics: string[] = [],
): Promise<{
  topic: string;
  audience: string;
  content_type: string;
}> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_DEFAULT_MODEL?.trim() || "gpt-4o-mini";
  const brandName = settings?.brand_name ?? "Trouv Chauffeurs";

  const recentBlock = recentTopics.length
    ? `\n\nBLOCKLIST — these topics have been posted in the last 60 days. LinkedIn will REJECT posts that are too similar. You MUST NOT repeat, rephrase, or create any variation of these:\n${recentTopics.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nYour new topic must be so different that no reader could confuse it with any topic above.`
    : "";

  const system = `You are a content strategist for ${brandName}, a premium London chauffeur service based in Mayfair (Trouv Chauffeurs company LinkedIn).

Generate ONE unique idea aligned to this performance hierarchy (prefer higher-ranked when it fits):
1. operational — real fleet on location, chauffeur and vehicle, airside (e.g. Farnborough, London City), multi-vehicle event logistics
2. behind the scenes — specific real-job details (named airports, hotel drops, roadshows, early starts)
3. case study — anonymised client problem and outcome
4. tip — practical, opinionated for PAs, travel managers, or executives
5. seasonal — only if tied to a service story or operational moment (not generic holiday copy)
6. announcement — when appropriate

Return JSON only with exactly these keys:
- topic: a concise, concrete brief (prefer specific detail: time, route, airport, vehicle, scenario). Never generic filler.
- audience: one target label (e.g. "Executive PAs", "Corporate travel managers", "C-suite executives", "Luxury travel advisors")
- content_type: exactly one of: operational | behind the scenes | case study | tip | seasonal | announcement

CRITICAL UNIQUENESS RULES (LinkedIn rejects similar posts within 60 days):
- The topic must be COMPLETELY DIFFERENT from any in the blocklist below.
- Do not rephrase, reword, use synonyms, or create ANY variation of existing topics.
- Each idea must cover a genuinely new angle, subject, or perspective.
- Avoid recycling the same themes (e.g. "sustainability", "first impressions", "airport transfers") if they already appear in the blocklist — find a fresh theme entirely.
- If you run out of obvious topics, think laterally: behind-the-scenes ops, specific routes, seasonal angles, industry news, client scenarios, fleet technology, driver training, compliance, accessibility, etc.
Focus on real operational value for premium corporate clients.${recentBlock}
Return JSON only — no markdown, no explanation.`;

  const client = new OpenAI({ apiKey });
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: "Generate a completely new and unique content idea that has never been used before." },
    ],
    temperature: 0.95,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty OpenAI response for idea brief");

  console.log(
    JSON.stringify({
      event: "idea_response_received",
      timestamp: new Date().toISOString(),
      raw_text: raw.slice(0, LOG_RAW_MAX),
      length: raw.length,
    }),
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const err = new Error("OpenAI returned invalid JSON for idea brief");
    console.error(
      JSON.stringify({
        event: "idea_zod_validation_failed",
        error: err.message,
        received: { raw_text: raw.slice(0, LOG_RAW_MAX), length: raw.length },
        zod_issues: null,
      }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({
      event: "idea_response_parsed",
      parsed,
    }),
  );

  const obj = parsed as Record<string, unknown>;
  const topic = String(obj.topic ?? "").trim();
  const audience = String(obj.audience ?? "").trim();
  const content_type = String(obj.content_type ?? "").trim();

  if (!topic || !audience || !content_type) {
    const err = new Error("Incomplete idea brief from OpenAI");
    console.error(
      JSON.stringify({
        event: "idea_zod_validation_failed",
        error: err.message,
        received: parsed,
        zod_issues: null,
      }),
    );
    throw err;
  }

  return { topic, audience, content_type };
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
  recentHooks?: string[];
}): Promise<{ output: GenerationOutput; model: string }> {
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

  const uniqueHooks = (input.recentHooks ?? []).slice(0, 40);
  const hooksBlock = uniqueHooks.length
    ? `\n\nUNIQUENESS REQUIREMENT (critical — LinkedIn rejects similar posts within 60 days):
These opening lines / hooks have already been posted. Your hooks and body copy MUST be completely different — different wording, different angle, different structure. Do NOT reuse any phrase, sentence pattern, or opening style from this list:
${uniqueHooks.map((h, i) => `${i + 1}. "${h}"`).join("\n")}
Write something genuinely fresh that a reader would never confuse with any post above.`
    : "";

  const appBanned =
    banned.length > 0
      ? `\n\nApp-configured banned phrases (do not use): ${banned.join("; ")}`
      : "";

  const system = `${TROUV_COPY_PLAYBOOK}

Organization context (metadata only; follow COMPANY NAME RULES in copy): ${brandName}.
Secondary tone note from app settings (must not override the playbook): ${brandTone}.

Target platforms for this request: ${input.platforms.join(", ")}.
For each target platform, fill hook, body, and CTA fields (linkedin_hook / linkedin_post / linkedin_cta, etc.).
For platforms NOT in the target list, use empty strings for all three fields.${appBanned}${feedbackBlock}${hooksBlock}

API OUTPUT (required)
Return JSON only — no markdown, no preamble, no keys beyond those listed.
Exactly these keys:
linkedin_hook, linkedin_post, linkedin_cta,
instagram_hook, instagram_caption, instagram_cta,
hashtags (array of strings, no leading #; at most 3 items, often [])`;

  const user = JSON.stringify({
    topic: input.topic,
    audience: input.audience,
    content_type: input.content_type,
    brand_name: brandName,
    brand_tone: brandTone,
  });

  const { text: raw, model } = await generateSocialPost({
    systemPrompt: system,
    brief: user,
    maxTokens: 1024,
  });

  console.log(
    JSON.stringify({
      event: "writer_response_received",
      timestamp: new Date().toISOString(),
      raw_text: raw.slice(0, LOG_RAW_MAX),
      length: raw.length,
    }),
  );

  let parsed: unknown;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON object");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (writeParseErr) {
    const err =
      writeParseErr instanceof Error
        ? new Error(
            `Claude returned invalid JSON for social generation: ${writeParseErr.message}`,
          )
        : new Error("Claude returned invalid JSON for social generation");
    console.error(
      JSON.stringify({
        event: "writer_zod_validation_failed",
        error: err.message,
        received: { raw_text: raw.slice(0, LOG_RAW_MAX), length: raw.length },
        zod_issues: null,
      }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({
      event: "writer_response_parsed",
      parsed,
    }),
  );

  let output: GenerationOutput;
  try {
    output = generationOutputSchema.parse(parsed);
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "writer_zod_validation_failed",
        error: err instanceof Error ? err.message : String(err),
        received: parsed,
        zod_issues: zodFailureIssues(err),
      }),
    );
    throw err;
  }
  return { output, model };
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

Brand tone (app settings): ${brandTone}
${strictnessGuide}
App banned phrases: ${banned.length ? banned.join("; ") : "none"}

${TROUV_REVIEW_RUBRIC}

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
  "revised_suggestions": { "linkedin": string, "instagram": string }
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

  console.log(
    JSON.stringify({
      event: "review_response_received",
      timestamp: new Date().toISOString(),
      raw_text: raw.slice(0, LOG_RAW_MAX),
      length: raw.length,
    }),
  );

  let parsed: unknown;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON object");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (reviewParseErr) {
    const err =
      reviewParseErr instanceof Error
        ? new Error(
            `Claude review response was not valid JSON: ${reviewParseErr.message}`,
          )
        : new Error("Claude review response was not valid JSON");
    console.error(
      JSON.stringify({
        event: "review_zod_validation_failed",
        error: err.message,
        received: { raw_text: raw.slice(0, LOG_RAW_MAX), length: raw.length },
        zod_issues: null,
      }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({
      event: "review_response_parsed",
      parsed,
    }),
  );

  let output: ReviewOutput;
  try {
    output = reviewOutputSchema.parse(parsed);
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "review_zod_validation_failed",
        error: err instanceof Error ? err.message : String(err),
        received: parsed,
        zod_issues: zodFailureIssues(err),
      }),
    );
    throw err;
  }
  return { output, model };
}
