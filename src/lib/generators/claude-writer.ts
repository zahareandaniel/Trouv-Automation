import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_WRITING_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 1024;

export type GenerateSocialPostParams = {
  systemPrompt: string;
  brief: string;
  /** Defaults to 1024. */
  maxTokens?: number;
  /** Defaults to claude-sonnet-4-5 or ANTHROPIC_WRITING_MODEL. */
  model?: string;
};

/**
 * Single-turn Claude completion for social copy (JSON in assistant text).
 */
export async function generateSocialPost(
  params: GenerateSocialPostParams,
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const model =
    params.model?.trim() ||
    process.env.ANTHROPIC_WRITING_MODEL?.trim() ||
    DEFAULT_WRITING_MODEL;
  const max_tokens = params.maxTokens ?? DEFAULT_MAX_TOKENS;

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model,
    max_tokens,
    temperature: 0.55,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.brief }],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("Empty or non-text Claude response for social generation");
  }

  return { text: block.text, model };
}
