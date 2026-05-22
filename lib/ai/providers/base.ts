// ── AIProvider Interface ──────────────────────────────────────────
// Canonical contract for all AI providers (mock, OpenAI, Anthropic, etc.)

import type { PromptMode, IntentAnalysis, Requirements } from "@/types";

export interface AIProvider {
  /** Stage 0: Classify the user's intent from their transcript */
  analyzeIntent(
    transcript: string,
    mode: PromptMode,
  ): Promise<IntentAnalysis>;

  /** Stage 1: Extract structured requirements from transcript + intent */
  extractRequirements(
    transcript: string,
    intent: IntentAnalysis,
  ): Promise<Requirements>;

  /** Stage 2: Stream an enhanced prompt tailored for AI coding assistants */
  enhancePrompt(
    transcript: string,
    intent: IntentAnalysis,
    requirements: Requirements,
    mode: PromptMode,
  ): AsyncGenerator<string>;

  /** Cancel an in-progress generation (optional) */
  cancel?(): void;
}
