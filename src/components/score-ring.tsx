interface ScoreRingProps {
  label: string;
  score: number; // 0-100
  sublabel?: string;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-positive)";
  if (score >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

export function ScoreRing({ label, score, sublabel }: ScoreRingProps) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-card border border-border bg-surface-raised p-4">
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${label}: ${score} of 100`}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 32 32)"
        />
        <text
          x="32"
          y="37"
          textAnchor="middle"
          className="fill-content text-base font-semibold"
        >
          {score}
        </text>
      </svg>
      <span className="text-sm font-medium">{label}</span>
      {sublabel && <span className="text-xs text-content-muted">{sublabel}</span>}
    </div>
  );
}
