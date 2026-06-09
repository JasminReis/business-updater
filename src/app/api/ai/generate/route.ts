import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiGenerations } from "@/db/schema";
import { generateWebsiteContent, AI_MODEL } from "@/lib/ai/client";
import { ApiError, errorResponse, requireMembership } from "@/lib/authz";

/**
 * POST /api/ai/generate — AI website content for one section.
 * Streams raw text deltas (text/plain); the editor renders them progressively.
 */

const Body = z.object({
  siteId: z.string().uuid(),
  sectionKey: z.string().min(1),
  instructions: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const body = Body.parse(await request.json().catch(() => ({})));

    const site = await db.query.sites.findFirst({
      where: (s, { eq: eq_ }) => eq_(s.id, body.siteId),
    });
    if (!site) throw new ApiError(404, "not_found");
    const { userId } = await requireMembership(site.businessId);

    const [business, section] = await Promise.all([
      db.query.businesses.findFirst({
        where: (b, { eq: eq_ }) => eq_(b.id, site.businessId),
      }),
      db.query.contentSections.findFirst({
        where: (cs, { and, eq: eq_ }) =>
          and(eq_(cs.siteId, site.id), eq_(cs.key, body.sectionKey)),
      }),
    ]);
    if (!business || !section) throw new ApiError(404, "not_found");

    const [generation] = await db
      .insert(aiGenerations)
      .values({
        businessId: site.businessId,
        userId,
        task: "website_content",
        input: { sectionKey: body.sectionKey, instructions: body.instructions },
        model: AI_MODEL,
      })
      .returning({ id: aiGenerations.id });

    const { body: stream, final } = generateWebsiteContent({
      business,
      sectionLabel: section.label,
      currentContent:
        typeof section.content === "string"
          ? section.content
          : JSON.stringify(section.content ?? ""),
      instructions: body.instructions,
    });

    // Log completion without blocking the streamed response.
    final
      .then(({ text, inputTokens, outputTokens }) =>
        db
          .update(aiGenerations)
          .set({ output: { text }, inputTokens, outputTokens, status: "done" })
          .where(eq(aiGenerations.id, generation.id)),
      )
      .catch(() =>
        db
          .update(aiGenerations)
          .set({ status: "error" })
          .where(eq(aiGenerations.id, generation.id)),
      );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Generation-Id": generation.id,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ApiError(400, "invalid_input", err.message));
    }
    return errorResponse(err);
  }
}
