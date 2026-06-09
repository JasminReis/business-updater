import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { aiSuggestions, healthSnapshots, reviews } from "@/db/schema";
import { ScoreRing } from "@/components/score-ring";
import { ReviewCard } from "@/components/review-card";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.query.memberships.findFirst({
    where: (m, { eq: eq_ }) => eq_(m.userId, session.user!.id!),
    with: { business: true } as never, // relation typing finalized with relations() config
  });
  if (!membership) redirect("/onboarding");

  const businessId = membership.businessId;

  const [business, snapshot, suggestions, location] = await Promise.all([
    db.query.businesses.findFirst({ where: (b, { eq: eq_ }) => eq_(b.id, businessId) }),
    db.query.healthSnapshots.findFirst({
      where: eq(healthSnapshots.businessId, businessId),
      orderBy: desc(healthSnapshots.createdAt),
    }),
    db.query.aiSuggestions.findMany({
      where: (s, { and, eq: eq_ }) =>
        and(eq_(s.businessId, businessId), eq_(s.status, "open")),
      orderBy: desc(aiSuggestions.createdAt),
      limit: 3,
    }),
    db.query.gbpLocations.findFirst({
      where: (l, { eq: eq_ }) => eq_(l.businessId, businessId),
    }),
  ]);

  const recentReviews = location
    ? await db.query.reviews.findMany({
        where: eq(reviews.gbpLocationId, location.id),
        orderBy: desc(reviews.reviewedAt),
        limit: 3,
      })
    : [];

  const firstName = session.user.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="pt-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-content-muted">{business?.name}</p>
      </header>

      <section aria-label="Health scores" className="mt-5 flex gap-3">
        <ScoreRing label="Website" score={snapshot?.websiteHealth ?? 0} />
        <ScoreRing label="SEO" score={snapshot?.seoScore ?? 0} />
        <ScoreRing label="Google" score={snapshot?.gbpCompleteness ?? 0} />
      </section>

      <section className="mt-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">
          Suggested actions
        </h2>
        <div className="mt-3 flex flex-col gap-3">
          {suggestions.length === 0 && (
            <p className="rounded-card border border-border bg-surface-raised p-4 text-sm text-content-muted">
              You&apos;re all caught up. ✦
            </p>
          )}
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={(s.payload as { href?: string } | null)?.href ?? "/assistant"}
              className="rounded-card border border-border bg-surface-raised p-4 active:scale-[0.99]"
            >
              <p className="font-medium">
                <span className="text-accent">✦</span> {s.title}
              </p>
              {s.body && <p className="mt-1 text-sm text-content-muted">{s.body}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-content-muted">
            Recent reviews
          </h2>
          <Link href="/business" className="text-sm text-accent">
            See all
          </Link>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {recentReviews.length === 0 && (
            <p className="rounded-card border border-border bg-surface-raised p-4 text-sm text-content-muted">
              {location
                ? "No reviews yet."
                : "Connect your Google Business Profile to see reviews here."}
            </p>
          )}
          {recentReviews.map((r) => (
            <ReviewCard
              key={r.id}
              reviewerName={r.reviewerName ?? "Anonymous"}
              rating={r.rating}
              comment={r.comment}
              reviewedAt={r.reviewedAt}
              replyStatus={r.replyStatus}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
