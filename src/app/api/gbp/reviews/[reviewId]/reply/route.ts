import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { replyToReview } from "@/lib/integrations/google-business";
import { getGoogleBusinessToken } from "@/lib/integrations/tokens";
import { ApiError, errorResponse, requireMembership } from "@/lib/authz";

/**
 * POST /api/gbp/reviews/:reviewId/reply — publish a reply to Google.
 * The text may come from an AI draft, but publishing is always an explicit
 * user action with the final (possibly edited) text in the request body.
 */

const Body = z.object({ text: z.string().min(1).max(4000) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const { reviewId } = await params;
    const body = Body.parse(await request.json().catch(() => ({})));

    const review = await db.query.reviews.findFirst({
      where: (r, { eq: eq_ }) => eq_(r.id, reviewId),
    });
    if (!review) throw new ApiError(404, "not_found");

    const location = await db.query.gbpLocations.findFirst({
      where: (l, { eq: eq_ }) => eq_(l.id, review.gbpLocationId),
    });
    if (!location) throw new ApiError(404, "not_found");

    await requireMembership(location.businessId);

    const token = await getGoogleBusinessToken(location.businessId);
    try {
      await replyToReview(token, review.googleReviewName, body.text);
    } catch (err) {
      console.error("GBP reply failed", err);
      throw new ApiError(502, "google_error", "Google rejected the reply — try again");
    }

    const [updated] = await db
      .update(reviews)
      .set({ replyText: body.text, replyStatus: "published", repliedAt: new Date() })
      .where(eq(reviews.id, review.id))
      .returning();

    return Response.json({ review: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return errorResponse(new ApiError(400, "invalid_input", err.message));
    }
    return errorResponse(err);
  }
}
