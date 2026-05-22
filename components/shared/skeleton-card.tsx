// ── SkeletonCard ──────────────────────────────────────────────────
// Reusable shimmer skeleton card for loading states.

// ── Types ────────────────────────────────────────────────────────

interface SkeletonCardProps {
  /** Number of content lines to show (default: 3) */
  lines?: number;
  /** Optional class name override */
  className?: string;
}

// ── Component ────────────────────────────────────────────────────

export function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 ${className}`}
    >
      {/* Shimmer overlay */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-800/20 to-transparent" />

      {/* Status bar skeleton */}
      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-zinc-800" />

      <div className="flex items-start gap-3">
        {/* Circle skeleton */}
        <div className="w-6 h-6 rounded-full bg-zinc-800 shrink-0" />

        <div className="flex-1 space-y-2">
          {/* Title skeleton */}
          <div className="h-3 w-24 rounded bg-zinc-800" />

          {/* Content line skeletons */}
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="h-2.5 rounded bg-zinc-800/60"
              style={{ width: `${60 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
