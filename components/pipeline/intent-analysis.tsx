// ── IntentAnalysis ───────────────────────────────────────────────
// Thin wrapper around PipelineStep for the Intent Analysis stage.
// Shows detected intent type, confidence level, and keywords.

"use client";

import { PipelineStep } from "./pipeline-step";
import type { StageStatus, StageOutput } from "@/types";
import type { IntentAnalysis as IntentAnalysisType } from "@/types";

// ── Types ────────────────────────────────────────────────────────

interface IntentAnalysisProps {
  status: StageStatus;
  tokens?: string[];
  content?: string;
  output?: StageOutput | null;
  error?: string;
  delay?: number;
}

// ── Component ────────────────────────────────────────────────────

export function IntentAnalysis({
  status,
  tokens = [],
  content,
  output,
  error,
  delay,
}: IntentAnalysisProps) {
  const intent = output as IntentAnalysisType | null;

  return (
    <PipelineStep
      stepNumber={2}
      title="Intent Analysis"
      status={status}
      tokens={tokens}
      content={content}
      error={error}
      delay={delay}
    >
      {intent && status !== "pending" && (
        <div className="flex flex-wrap gap-3 mt-2">
          {/* Intent Type */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Type
            </span>
            <span className="text-xs text-zinc-300 font-medium">
              {intent.label}
            </span>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Confidence
            </span>
            <span className="text-xs text-zinc-300">
              {Math.round(intent.confidence * 100)}%
            </span>
          </div>

          {/* Keywords */}
          {intent.keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                Keywords
              </span>
              {intent.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </PipelineStep>
  );
}
