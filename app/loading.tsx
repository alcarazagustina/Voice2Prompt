// ── Loading Page ──────────────────────────────────────────────────
// Shown during initial page load (Next.js Suspense boundary).

import { SkeletonCard } from "@/components/shared/skeleton-card";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-20">
      {/* Hero skeleton */}
      <div className="flex flex-col items-center mb-16">
        <div className="h-10 w-72 rounded-lg bg-zinc-800/60 mb-4 animate-pulse" />
        <div className="h-4 w-48 rounded bg-zinc-800/40 animate-pulse" />
      </div>

      {/* Mode selector skeleton */}
      <div className="flex justify-center mb-10">
        <div className="h-9 w-96 rounded-full bg-zinc-800/50 animate-pulse" />
      </div>

      {/* Recorder skeleton */}
      <div className="flex justify-center mb-16">
        <div className="w-24 h-24 rounded-full bg-zinc-800/50 animate-pulse" />
      </div>

      {/* Feature cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </div>
  );
}
