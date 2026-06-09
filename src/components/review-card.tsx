interface ReviewCardProps {
  reviewerName: string;
  rating: number;
  comment: string | null;
  reviewedAt: Date;
  replyStatus: "none" | "draft" | "published";
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function ReviewCard({ reviewerName, rating, comment, reviewedAt, replyStatus }: ReviewCardProps) {
  return (
    <div className="rounded-card border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span aria-label={`${rating} of 5 stars`} className="text-warning">
            {"★".repeat(rating)}
            <span className="text-border">{"★".repeat(5 - rating)}</span>
          </span>
          <span className="text-sm font-medium">{reviewerName}</span>
          <span className="text-xs text-content-muted">· {timeAgo(reviewedAt)}</span>
        </div>
        {replyStatus === "published" ? (
          <span className="text-xs text-positive">✓ replied</span>
        ) : (
          <span className="text-xs text-warning">⚠ needs reply</span>
        )}
      </div>
      {comment && <p className="mt-2 line-clamp-2 text-sm text-content-muted">{comment}</p>}
    </div>
  );
}
