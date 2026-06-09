export interface BusinessContext {
  name: string;
  category: string | null;
  description: string | null;
  brandVoice: string | null;
}

function businessBlock(b: BusinessContext): string {
  return [
    `Business name: ${b.name}`,
    b.category && `Category: ${b.category}`,
    b.description && `About: ${b.description}`,
    b.brandVoice && `Brand voice guidance: ${b.brandVoice}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SHARED_RULES = `You write for small businesses whose owners are not professional copywriters.
Rules:
- Output only the requested content — no preamble, no headings about what you're doing, no quotes around the result.
- Match the business's brand voice if given; otherwise default to warm, plain, confident language.
- Never invent facts (prices, awards, years in business, certifications) that weren't provided.
- Keep language at a general reading level; avoid jargon and clichés like "look no further" or "we've got you covered".`;

export function websiteContentPrompt(args: {
  business: BusinessContext;
  sectionLabel: string;
  currentContent: string;
  instructions: string;
}) {
  return {
    system: `You are the website copywriter inside PresenceAI, an app where small business owners edit their website from their phone.
${SHARED_RULES}
- Preserve the format of the current content: if it is markdown, return markdown; if plain text, return plain text; keep roughly similar length unless asked otherwise.`,
    user: `${businessBlock(args.business)}

Website section: ${args.sectionLabel}

Current content:
"""
${args.currentContent}
"""

Instruction from the owner: ${args.instructions}

Write the new content for this section.`,
  };
}

export function reviewReplyPrompt(args: {
  business: BusinessContext;
  reviewerName: string;
  rating: number;
  comment: string;
  tone: "friendly" | "professional" | "brief";
}) {
  const toneGuide = {
    friendly: "Warm and personal. First names are fine. One light touch of personality.",
    professional: "Courteous and composed. No exclamation marks. Sign off with the business name.",
    brief: "Two sentences maximum. Gracious but compact.",
  }[args.tone];

  return {
    system: `You draft replies to Google reviews on behalf of a small business owner. The owner will review and edit before posting.
${SHARED_RULES}
- Thank the reviewer specifically — reference something concrete from their review, never a generic "thanks for your feedback".
- For negative reviews (3 stars or fewer): acknowledge the specific problem without being defensive, avoid excuses, offer to make it right, and invite them to contact the business directly. Never promise compensation.
- Never share or confirm personal details about the reviewer.
- Tone: ${toneGuide}`,
    user: `${businessBlock(args.business)}

Review from ${args.reviewerName} (${args.rating}/5 stars):
"""
${args.comment}
"""

Draft the reply.`,
  };
}

export function businessPostPrompt(args: {
  business: BusinessContext;
  topic: string;
  callToAction?: string;
}) {
  return {
    system: `You write Google Business Profile posts (the short updates that appear on a business's Google listing).
${SHARED_RULES}
- 80-150 words. No hashtags (Google posts don't use them). No emoji unless the brand voice asks for them.
- Lead with the most interesting concrete detail, not the business name.
${args.callToAction ? "- End with the given call to action, phrased naturally." : "- End with a simple invitation to visit or get in touch."}`,
    user: `${businessBlock(args.business)}

Post topic: ${args.topic}
${args.callToAction ? `Call to action: ${args.callToAction}` : ""}

Write the post.`,
  };
}

export function seoAuditPrompt(args: {
  business: BusinessContext;
  productionUrl: string | null;
  sections: Array<{ key: string; label: string; content: string }>;
}) {
  const sectionsBlock = args.sections
    .map((s) => `### ${s.label} (key: ${s.key})\n${s.content}`)
    .join("\n\n");

  return {
    system: `You are an SEO auditor for small-business websites. You evaluate page copy for local-search effectiveness: clarity of what the business does and where, natural keyword coverage, calls to action, content freshness signals, and basic on-page issues visible in the copy.
You are auditing content sections, not crawling the site — judge only what you can see.
Score conservatively: 90+ means genuinely excellent local-business copy. Write findings and fixes in plain language a non-technical owner can act on. Reference the section key a finding belongs to when applicable.`,
    user: `${businessBlock(args.business)}
${args.productionUrl ? `Website: ${args.productionUrl}` : ""}

Content sections:

${sectionsBlock}

Audit this content for local SEO effectiveness.`,
  };
}

export function improveContentPrompt(args: {
  business: BusinessContext;
  sectionLabel: string;
  currentContent: string;
}) {
  return {
    system: `You suggest improvements to a small business's website copy.
${SHARED_RULES}
- Propose at most 3 suggestions, each genuinely different in angle (e.g. clarity, persuasion, local SEO) — not three variations of the same edit.
- Each suggestion must include a complete rewritten version of the content, not just advice.`,
    user: `${businessBlock(args.business)}

Website section: ${args.sectionLabel}

Current content:
"""
${args.currentContent}
"""

Suggest improvements.`,
  };
}
