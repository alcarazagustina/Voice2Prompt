// ── Pipeline Orchestrator ────────────────────────────────────────
// Runs the AI pipeline sequentially: intent → requirements → enhancement → finalize.
// Supports cancellation via AbortController and yields progress updates.

import type {
  PromptMode,
  PipelineStage,
  StageStatus,
  StageOutput,
  IntentAnalysis,
  Requirements,
  PipelineStageResult,
  PipelineResult,
} from "@/types";
import type { AIProvider } from "@/lib/ai/providers/base";

// ── Types ────────────────────────────────────────────────────────

/** Progress yielded by the pipeline as it executes */
export interface PipelineProgress {
  stage: PipelineStage;
  status: StageStatus;
  /** Human-readable data for the current stage */
  data: string;
  /** Overall pipeline progress 0–100 */
  progress: number;
  /** Structured stage output (populated when stage completes) */
  output?: StageOutput;
}

const STAGES: PipelineStage[] = [
  "intent",
  "requirements",
  "enhancement",
  "finalize",
];

/** How much each stage contributes to overall progress (sum = 100) */
const STAGE_WEIGHTS: Record<PipelineStage, number> = {
  intent: 15,
  requirements: 25,
  enhancement: 45,
  finalize: 15,
};

// ── Pipeline Runner ──────────────────────────────────────────────

/**
 * Execute the full AI pipeline.
 *
 * Yields `PipelineProgress` objects as each stage progresses.
 * Supports cancellation via `AbortSignal`.
 */
export async function* runPipeline(
  transcript: string,
  mode: PromptMode,
  provider: AIProvider,
  signal?: AbortSignal,
): AsyncGenerator<PipelineProgress> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    yield {
      stage: "intent",
      status: "error",
      data: "Cannot process empty transcript",
      progress: 0,
    };
    return;
  }

  const stageResults: PipelineStageResult[] = STAGES.map((stage) => ({
    stage,
    content: "",
    status: "pending" as StageStatus,
    tokens: [],
    output: null,
  }));

  let intentResult: IntentAnalysis | null = null;
  let requirementsResult: Requirements | null = null;
  let enhancedContent = "";

  // ── Stage 0: Intent Analysis ───────────────────────────────
  yield* runStage("intent", stageResults, 0, async () => {
    checkSignal(signal);
    const result = await provider.analyzeIntent(trimmed, mode);
    intentResult = result;
    return result;
  });
  if (signal?.aborted) return;

  // ── Stage 1: Requirements Extraction ───────────────────────
  yield* runStage("requirements", stageResults, STAGE_WEIGHTS.intent, async () => {
    checkSignal(signal);
    const result = await provider.extractRequirements(
      trimmed,
      intentResult!,
    );
    requirementsResult = result;
    return result;
  });
  if (signal?.aborted) return;

  // ── Stage 2: Prompt Enhancement (streaming) ────────────────
  yield* runStreamingStage(
    "enhancement",
    stageResults,
    STAGE_WEIGHTS.intent + STAGE_WEIGHTS.requirements,
    async function* () {
      checkSignal(signal);
      const generator = provider.enhancePrompt(
        trimmed,
        intentResult!,
        requirementsResult!,
        mode,
      );

      let accumulated = "";
      for await (const chunk of generator) {
        if (signal?.aborted) {
          provider.cancel?.();
          break;
        }
        accumulated += chunk;
        yield chunk;
      }
      enhancedContent = accumulated;
      return {
        stage: "enhancement" as const,
        content: accumulated,
      };
    },
  );
  if (signal?.aborted) return;

  // ── Stage 3: Finalize ──────────────────────────────────────
  yield* runStage("finalize", stageResults,
    STAGE_WEIGHTS.intent + STAGE_WEIGHTS.requirements + STAGE_WEIGHTS.enhancement,
    async () => {
      await sleep(150);
      return {
        stage: "finalize" as const,
        content: enhancedContent,
      };
    },
  );

  // ── Completion ─────────────────────────────────────────────
  const finalPrompt = enhancedContent;
  for (const sr of stageResults) {
    sr.status = "complete";
  }

  yield {
    stage: "finalize",
    status: "complete",
    data: finalPrompt,
    progress: 100,
    output: { stage: "finalize", content: finalPrompt },
  };
}

/**
 * Build the final PipelineResult from the generator output.
 * Call this after consuming all yields from runPipeline.
 */
export function buildResult(generator: AsyncGenerator<PipelineProgress>): {
  result: Promise<PipelineResult>;
  cancel: () => void;
} {
  const cancel = () => {
    generator.return(undefined as unknown as IteratorResult<PipelineProgress>);
  };

  const result = (async (): Promise<PipelineResult> => {
    const stageMap = new Map<PipelineStage, PipelineStageResult>();
    for (const stage of STAGES) {
      stageMap.set(stage, {
        stage,
        content: "",
        status: "pending",
        tokens: [],
        output: null,
      });
    }

    let status: PipelineResult["status"] = "running";
    let finalPrompt = "";

    try {
      for await (const progress of generator) {
        const existing = stageMap.get(progress.stage)!;
        existing.status = progress.status;
        existing.content = progress.data;

        if (progress.output) {
          existing.output = progress.output;
          existing.tokens = [progress.data];
        }

        if (progress.status === "complete") {
          finalPrompt = progress.data;
        }
      }
      status = finalPrompt ? "complete" : "cancelled";
    } catch {
      status = "error";
    }

    return {
      status,
      stages: STAGES.map((s) => stageMap.get(s)!),
      finalPrompt,
    };
  })();

  return { result, cancel };
}

// ── Stage Runners ────────────────────────────────────────────────

function checkSignal(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Pipeline cancelled", "AbortError");
  }
}

async function* runStage(
  stage: PipelineStage,
  _results: PipelineStageResult[],
  baseProgress: number,
  fn: () => Promise<StageOutput>,
): AsyncGenerator<PipelineProgress> {
  // Yield: starting
  yield {
    stage,
    status: "streaming",
    data: "Processing...",
    progress: baseProgress,
  };

  try {
    const output = await fn();

    yield {
      stage,
      status: "complete",
      data: formatStageOutput(stage, output),
      progress: baseProgress + STAGE_WEIGHTS[stage],
      output,
    };
  } catch (err) {
    const isCancelled =
      err instanceof DOMException && err.name === "AbortError";

    yield {
      stage,
      status: isCancelled ? "pending" : "error",
      data: isCancelled
        ? "Cancelled"
        : `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      progress: baseProgress,
    };
  }
}

async function* runStreamingStage(
  stage: PipelineStage,
  _results: PipelineStageResult[],
  baseProgress: number,
  fn: () => AsyncGenerator<string>,
): AsyncGenerator<PipelineProgress> {
  const stageRange = STAGE_WEIGHTS[stage];
  let chunkCount = 0;

  try {
    const generator = fn();
    let accumulated = "";
    let output: StageOutput | null = null;

    for await (const chunk of generator) {
      accumulated += chunk;
      chunkCount++;

      // Progress within this stage: incrementally advance
      const stageProgress = Math.min(
        (chunkCount / 10) * stageRange,
        stageRange * 0.9,
      );

      yield {
        stage,
        status: "streaming",
        data: chunk,
        progress: Math.min(
          baseProgress + stageProgress,
          baseProgress + stageRange - 1,
        ),
      };
    }

    output = {
      stage: "enhancement" as const,
      content: accumulated,
    };

    yield {
      stage,
      status: "complete",
      data: accumulated,
      progress: baseProgress + stageRange,
      output,
    };
  } catch (err) {
    const isCancelled =
      err instanceof DOMException && err.name === "AbortError";

    yield {
      stage,
      status: isCancelled ? "pending" : "error",
      data: isCancelled
        ? "Cancelled"
        : `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      progress: baseProgress,
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function formatStageOutput(stage: PipelineStage, output: StageOutput): string {
  switch (stage) {
    case "intent": {
      const i = output as IntentAnalysis;
      return `**${i.label}** (confidence: ${Math.round(i.confidence * 100)}%)\n${i.reasoning}`;
    }
    case "requirements": {
      const r = output as Requirements;
      const parts: string[] = [];
      if (r.techStack.length) {
        parts.push(`Stack: ${r.techStack.join(", ")}`);
      }
      if (r.features.length) {
        parts.push(`Features: ${r.features.join(", ")}`);
      }
      if (r.constraints.length) {
        parts.push(`Constraints: ${r.constraints.join("; ")}`);
      }
      return parts.join("\n");
    }
    case "finalize": {
      const f = output as { stage: "finalize"; content: string };
      return f.content.length > 200
        ? f.content.slice(0, 200) + "..."
        : f.content;
    }
    default:
      return String(output);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
