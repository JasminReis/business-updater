import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  businessPostPrompt,
  improveContentPrompt,
  reviewReplyPrompt,
  seoAuditPrompt,
  websiteContentPrompt,
  type BusinessContext,
} from "./prompts";

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

export const AI_MODEL = "claude-opus-4-8";

// ---------------------------------------------------------------------------
// Streaming tasks — content the user watches being written
// ---------------------------------------------------------------------------

export interface StreamResult {
  /** Raw text deltas, ready to pipe into a Response body. */
  body: ReadableStream<Uint8Array>;
  /** Resolves after the stream ends, for logging tokens/output. */
  final: Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}

function streamTask(system: string, userPrompt: string, maxTokens = 4096): StreamResult {
  const stream = anthropic.messages.stream({
    model: AI_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
      stream.on("error", (err) => controller.error(err));
      stream.on("end", () => controller.close());
    },
    cancel() {
      stream.abort();
    },
  });

  const final = stream.finalMessage().then((message) => ({
    text: message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(""),
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }));

  return { body, final };
}

export function generateWebsiteContent(args: {
  business: BusinessContext;
  sectionLabel: string;
  currentContent: string;
  instructions: string;
}): StreamResult {
  const { system, user } = websiteContentPrompt(args);
  return streamTask(system, user);
}

export function generateReviewReply(args: {
  business: BusinessContext;
  reviewerName: string;
  rating: number;
  comment: string;
  tone: "friendly" | "professional" | "brief";
}): StreamResult {
  const { system, user } = reviewReplyPrompt(args);
  return streamTask(system, user, 1024);
}

export function generateBusinessPost(args: {
  business: BusinessContext;
  topic: string;
  callToAction?: string;
}): StreamResult {
  const { system, user } = businessPostPrompt(args);
  return streamTask(system, user, 1024);
}

// ---------------------------------------------------------------------------
// Structured tasks — JSON results validated against a schema
// ---------------------------------------------------------------------------

export const SeoAuditResult = z.object({
  score: z.number().describe("Overall SEO score 0-100"),
  summary: z.string().describe("One-paragraph plain-language summary for a non-technical owner"),
  issues: z.array(
    z.object({
      severity: z.enum(["high", "medium", "low"]),
      finding: z.string().describe("What is wrong, in plain language"),
      fix: z.string().describe("Concrete suggested fix the user can apply"),
      sectionKey: z.string().nullable().describe("Related content section key, if any"),
    }),
  ),
});
export type SeoAuditResult = z.infer<typeof SeoAuditResult>;

export async function runSeoAudit(args: {
  business: BusinessContext;
  productionUrl: string | null;
  sections: Array<{ key: string; label: string; content: string }>;
}): Promise<{ result: SeoAuditResult; inputTokens: number; outputTokens: number }> {
  const { system, user } = seoAuditPrompt(args);

  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 8192,
    thinking: { type: "adaptive" }, // audits benefit from reasoning over all sections
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(SeoAuditResult) },
  });

  if (!response.parsed_output) {
    throw new Error(`SEO audit returned no parseable output (stop: ${response.stop_reason})`);
  }
  return {
    result: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

export const ImprovementSuggestions = z.object({
  suggestions: z.array(
    z.object({
      title: z.string().describe("Short imperative title, e.g. 'Add a call to action'"),
      rationale: z.string().describe("Why this helps, one or two sentences"),
      rewrittenContent: z.string().describe("The improved version of the content"),
    }),
  ),
});
export type ImprovementSuggestions = z.infer<typeof ImprovementSuggestions>;

export async function suggestImprovements(args: {
  business: BusinessContext;
  sectionLabel: string;
  currentContent: string;
}): Promise<{ result: ImprovementSuggestions; inputTokens: number; outputTokens: number }> {
  const { system, user } = improveContentPrompt(args);

  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 4096,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(ImprovementSuggestions) },
  });

  if (!response.parsed_output) {
    throw new Error(`Improvement task returned no parseable output (stop: ${response.stop_reason})`);
  }
  return {
    result: response.parsed_output,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
