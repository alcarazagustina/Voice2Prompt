// ── Error Page ────────────────────────────────────────────────────
// Next.js error boundary for route-level errors.

"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-200 mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-zinc-500 mb-2">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-[10px] text-zinc-700 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors min-h-[44px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </button>
      </div>
    </div>
  );
}
