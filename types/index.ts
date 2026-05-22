// ── Voice2Prompt MVP — Shared Types ──────────────────────────────

/** The five supported prompt generation modes */
export type PromptMode =
  | "frontend"
  | "saas"
  | "automation"
  | "design"
  | "fullstack";

/** Individual pipeline stage names in execution order */
export type PipelineStage =
  | "intent"
  | "requirements"
  | "enhancement"
  | "finalize";

/** Status of a single pipeline stage */
export type StageStatus = "pending" | "streaming" | "complete" | "error";

/** Status of the pipeline as a whole */
export type PipelineStatus =
  | "idle"
  | "running"
  | "confirming"
  | "complete"
  | "cancelled"
  | "error";

/** Recording state machine states (matches Web Speech API lifecycle) */
export type RecordingState =
  | "idle"
  | "recording"
  | "processing"
  | "done"
  | "error";

// ── AI Pipeline Types ────────────────────────────────────────────

/** Result of Stage 0: intent classification */
export interface IntentAnalysis {
  stage: "intent";
  mode: PromptMode;
  label: string;
  confidence: number;
  keywords: string[];
  reasoning: string;
}

/** Result of Stage 1: requirement extraction */
export interface Requirements {
  stage: "requirements";
  techStack: string[];
  features: string[];
  constraints: string[];
  reasoning: string;
}

/** Result of Stage 2: prompt enhancement (the built prompt text) */
export interface EnhancedPrompt {
  stage: "enhancement";
  content: string;
}

/** Result of Stage 3: final prompt (post-processed for output) */
export interface FinalizedPrompt {
  stage: "finalize";
  content: string;
}

/** Union of all possible stage outputs */
export type StageOutput =
  | IntentAnalysis
  | Requirements
  | EnhancedPrompt
  | FinalizedPrompt;

/** A single pipeline stage with its runtime state */
export interface PipelineStageResult {
  stage: PipelineStage;
  content: string;
  status: StageStatus;
  tokens: string[];
  output: StageOutput | null;
}

/** Top-level result yielded by the pipeline orchestrator */
export interface PipelineResult {
  status: PipelineStatus;
  stages: PipelineStageResult[];
  finalPrompt: string;
}

// ── Persistence Types ────────────────────────────────────────────

/** A saved session stored in IndexedDB */
export interface Session {
  id?: number;
  mode: PromptMode;
  transcript: string;
  pipelineResults: PipelineStageResult[];
  finalPrompt: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Schema for creating a new session (before DB assign) */
export type NewSession = Omit<Session, "id">;

// ── AI Provider Interface (contract for mock / real providers) ───

/**
 * Core AI provider interface.
 * Decouples mock from future real providers (OpenAI, Anthropic, etc.).
 */
export interface AIProvider {
  analyzeIntent(
    transcript: string,
    mode: PromptMode,
  ): Promise<IntentAnalysis>;
  extractRequirements(
    transcript: string,
    intent: IntentAnalysis,
  ): Promise<Requirements>;
  enhancePrompt(
    transcript: string,
    intent: IntentAnalysis,
    requirements: Requirements,
    mode: PromptMode,
  ): AsyncGenerator<string, void, unknown>;
  finalizePrompt(enhanced: string): Promise<FinalizedPrompt>;
}
