// ── PromptEnhancement ─────────────────────────────────────────────
// Thin wrapper around PipelineStep for the Prompt Enhancement stage.
// Shows the enhanced prompt text with streaming reveal.

"use client";

import { PipelineStep } from "./pipeline-step";
import type { StageStatus, StageOutput } from "@/types";

// ── Types ────────────────────────────────────────────────────────

interface PromptEnhancementProps {
  status: StageStatus;
  tokens?: string[];
  content?: string;
  output?: StageOutput | null;
  error?: string;
  delay?: number;
}

// ── Component ────────────────────────────────────────────────────

export function PromptEnhancement({
  status,
  tokens = [],
  content,
  output,
  error,
  delay,
}: PromptEnhancementProps) {
  return (
    <PipelineStep
      stepNumber={4}
      title="Prompt Enhancement"
      status={status}
      tokens={tokens}
      content={content}
      error={error}
      delay={delay}
    />
  );
}
