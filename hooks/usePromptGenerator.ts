// ── usePromptGenerator Hook ──────────────────────────────────────
// Two-phase pipeline: Analyze (intent + requirements) → Confirm → Enhance
// Fixes streaming jitter by batching state updates.

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  PromptMode,
  PipelineStageResult,
  PipelineStatus,
  IntentAnalysis,
  Requirements,
  EnhancedPrompt,
  FinalizedPrompt,
} from "@/types";
import type { AIProvider } from "@/lib/ai/providers/base";
import { MockProvider } from "@/lib/ai/providers/mock-provider";
import { runPipeline } from "@/lib/ai/pipeline";
import { useIndexedDB } from "./useIndexedDB";

// ── Types ────────────────────────────────────────────────────────

export interface PromptGeneratorState {
  status: PipelineStatus;
  stages: PipelineStageResult[];
  finalPrompt: string;
  error: string | null;
  progress: number;
  savedSessionId: number | null;
  usingRealAI: boolean;
  /** Pending requirements waiting for user confirmation */
  pendingRequirements: Requirements | null;
  /** Pending intent for the confirmation step */
  pendingIntent: IntentAnalysis | null;
}

export interface UsePromptGeneratorReturn extends PromptGeneratorState {
  /** Start analysis (intent + requirements) */
  generate: (transcript: string, mode: PromptMode) => void;
  /** Confirm requirements and proceed to enhancement */
  confirmRequirements: (requirements: Requirements) => void;
  /** Regenerate requirements (restart analysis) */
  regenerateRequirements: () => void;
  /** Cancel a running pipeline */
  cancel: () => void;
  /** Reset state back to idle */
  reset: () => void;
  /** Whether the pipeline is currently running */
  isRunning: boolean;
  /** Whether the pipeline has completed */
  isComplete: boolean;
  /** Whether waiting for user confirmation */
  isConfirming: boolean;
}

const INITIAL_STATE: PromptGeneratorState = {
  status: "idle",
  stages: [],
  finalPrompt: "",
  error: null,
  progress: 0,
  savedSessionId: null,
  usingRealAI: false,
  pendingRequirements: null,
  pendingIntent: null,
};

// ── API Event Types ──────────────────────────────────────────────

interface APIStageEvent {
  type: "stage";
  stage: string;
  data?: unknown;
  progress: number;
}

interface APIChunkEvent {
  type: "chunk";
  text: string;
}

type APIEvent = APIStageEvent | APIChunkEvent;

// ── Hook ─────────────────────────────────────────────────────────

export function usePromptGenerator(
  provider?: AIProvider,
): UsePromptGeneratorReturn {
  const [state, setState] = useState<PromptGeneratorState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const cancelFnRef = useRef<(() => void) | null>(null);
  const providerRef = useRef<AIProvider>(provider ?? new MockProvider());
  const { isReady: dbReady, saveSession } = useIndexedDB();
  const runningRef = useRef(false);
  const transcriptRef = useRef("");
  const modeRef = useRef<PromptMode>("frontend");

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Phase 1: Analyze (Intent + Requirements) ───────────────────

  const analyzeWithAPI = useCallback(
    async (transcript: string, mode: PromptMode): Promise<boolean> => {
      try {
        const res = await fetch("/api/generate?phase=analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, mode }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.warn("[usePromptGenerator] Analyze API error:", res.status, text);
          return false;
        }

        const data = await res.json() as {
          intent: IntentAnalysis;
          requirements: Requirements;
          mode: PromptMode;
        };

        // Build stage results for intent + requirements
        const intentStage: PipelineStageResult = {
          stage: "intent",
          status: "complete",
          content: JSON.stringify(data.intent),
          tokens: [
            `Mode: ${data.intent.mode}`,
            `Label: ${data.intent.label}`,
            `Confidence: ${Math.round(data.intent.confidence * 100)}%`,
            `Keywords: ${data.intent.keywords.join(", ")}`,
          ],
          output: data.intent,
        };

        const reqStage: PipelineStageResult = {
          stage: "requirements",
          status: "complete",
          content: JSON.stringify(data.requirements),
          tokens: [
            `Tech: ${data.requirements.techStack.join(", ")}`,
            ...data.requirements.features.map((f) => `Feature: ${f}`),
            ...data.requirements.constraints.map((c) => `Constraint: ${c}`),
          ],
          output: data.requirements,
        };

        setState((prev) => ({
          ...prev,
          status: "confirming",
          stages: [intentStage, reqStage],
          progress: 50,
          pendingIntent: data.intent,
          pendingRequirements: data.requirements,
          usingRealAI: true,
        }));

        return true;
      } catch (err) {
        console.warn("[usePromptGenerator] Analyze failed:", err);
        return false;
      }
    },
    [],
  );

  const analyzeWithMock = useCallback(
    (transcript: string, mode: PromptMode, abortController: AbortController) => {
      const providerInstance = providerRef.current;
      const generator = runPipeline(transcript, mode, providerInstance, abortController.signal);

      (async () => {
        try {
          const collectedStages: PipelineStageResult[] = [];

          for await (const progress of generator) {
            const stageName = progress.stage;
            const existingIdx = collectedStages.findIndex((s) => s.stage === stageName);

            if (existingIdx >= 0) {
              const existing = collectedStages[existingIdx];
              collectedStages[existingIdx] = {
                ...existing,
                status: progress.status,
                content: progress.data,
                output: progress.output ?? existing.output,
                tokens: existing.tokens ? [...existing.tokens, progress.data] : [progress.data],
              };
            } else {
              collectedStages.push({
                stage: stageName,
                content: progress.data,
                status: progress.status,
                tokens: progress.output ? [progress.data] : [],
                output: progress.output ?? null,
              });
            }

            setState((prev) => ({
              ...prev,
              stages: [...collectedStages],
              progress: progress.progress,
            }));

            // Pause after requirements extraction
            if (stageName === "requirements" && progress.status === "complete") {
              const intent = collectedStages.find((s) => s.stage === "intent")?.output as IntentAnalysis | undefined;
              const requirements = collectedStages.find((s) => s.stage === "requirements")?.output as Requirements | undefined;

              if (intent && requirements) {
                setState((prev) => ({
                  ...prev,
                  status: "confirming",
                  pendingIntent: intent,
                  pendingRequirements: requirements,
                  usingRealAI: false,
                }));
              }
              return; // Stop the generator here
            }
          }
        } catch (err: unknown) {
          const isCancelled = err instanceof DOMException && err.name === "AbortError";
          if (!isCancelled) {
            setState((prev) => ({
              ...prev,
              status: "error",
              error: err instanceof Error ? err.message : "Unexpected error",
            }));
          }
        }
      })();
    },
    [],
  );

  // ── Phase 2: Enhance (Prompt Generation) ────────────────────────

  const enhanceWithAPI = useCallback(
    async (
      transcript: string,
      mode: PromptMode,
      intent: IntentAnalysis,
      requirements: Requirements,
    ): Promise<boolean> => {
      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const response = await fetch("/api/generate?phase=enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, mode, intent, requirements }),
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          console.warn("[usePromptGenerator] Enhance API error:", response.status);
          return false;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let enhancementText = "";

        // Batch state updates to fix jitter
        let pendingUpdate = "";
        let updateScheduled = false;

        const scheduleUpdate = () => {
          if (updateScheduled) return;
          updateScheduled = true;
          requestAnimationFrame(() => {
            updateScheduled = false;
            const text = pendingUpdate;
            pendingUpdate = "";
            if (!text) return;

            setState((prev) => {
              const stages = [...prev.stages];
              const enhanceIdx = stages.findIndex((s) => s.stage === "enhancement");
              const newContent = enhancementText; // Use the ref value

              if (enhanceIdx >= 0) {
                stages[enhanceIdx] = {
                  ...stages[enhanceIdx],
                  status: "streaming",
                  content: newContent,
                  tokens: [...(stages[enhanceIdx].tokens ?? []), text],
                };
              } else {
                stages.push({
                  stage: "enhancement",
                  status: "streaming",
                  content: newContent,
                  tokens: [text],
                  output: null,
                });
              }

              return {
                ...prev,
                stages,
                progress: Math.min(prev.progress + 2, 95),
              };
            });
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let event: APIEvent;
            try {
              event = JSON.parse(line) as APIEvent;
            } catch {
              continue;
            }

            if (event.type === "stage" && event.stage === "finalize" && event.data) {
              const data = event.data as FinalizedPrompt;
              enhancementText = data.content;

              setState((prev) => {
                const stages = [...prev.stages];
                const enhanceIdx = stages.findIndex((s) => s.stage === "enhancement");
                if (enhanceIdx >= 0) {
                  stages[enhanceIdx] = {
                    ...stages[enhanceIdx],
                    status: "complete",
                    content: data.content,
                    output: { stage: "enhancement", content: data.content },
                  };
                }
                stages.push({
                  stage: "finalize",
                  status: "complete",
                  content: data.content,
                  tokens: [],
                  output: { stage: "finalize", content: data.content },
                });
                return { ...prev, stages, finalPrompt: data.content, progress: 100, status: "complete" };
              });

              // Save to DB
              if (dbReady) {
                try {
                  const saved = await saveSession({
                    mode,
                    transcript,
                    pipelineResults: [],
                    finalPrompt: data.content,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  });
                  if (saved?.id !== undefined) {
                    setState((prev) => ({ ...prev, savedSessionId: saved.id as number }));
                  }
                } catch {}
              }
            } else if (event.type === "chunk") {
              const chunkEvent = event as APIChunkEvent;
              enhancementText += chunkEvent.text;
              pendingUpdate += chunkEvent.text;
              scheduleUpdate();
            }
          }
        }

        return true;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return false;
        console.warn("[usePromptGenerator] Enhance failed:", err);
        return false;
      }
    },
    [dbReady, saveSession],
  );

  const enhanceWithMock = useCallback(
    (transcript: string, mode: PromptMode, intent: IntentAnalysis, requirements: Requirements) => {
      const providerInstance = providerRef.current;
      const abortController = new AbortController();
      abortRef.current = abortController;

      const generator = providerInstance.enhancePrompt(transcript, intent, requirements, mode);

      (async () => {
        try {
          let enhancementText = "";
          let chunkCount = 0;

          // Batch updates every 100ms
          let pendingContent = "";
          let updateTimer: ReturnType<typeof setTimeout> | null = null;

          const flushUpdate = () => {
            if (!pendingContent) return;
            const content = pendingContent;
            pendingContent = "";

            setState((prev) => {
              const stages = [...prev.stages];
              const enhanceIdx = stages.findIndex((s) => s.stage === "enhancement");
              const newContent = enhancementText;

              if (enhanceIdx >= 0) {
                stages[enhanceIdx] = {
                  ...stages[enhanceIdx],
                  status: "streaming",
                  content: newContent,
                  tokens: [...(stages[enhanceIdx].tokens ?? []), content],
                };
              } else {
                stages.push({
                  stage: "enhancement",
                  status: "streaming",
                  content: newContent,
                  tokens: [content],
                  output: null,
                });
              }

              return {
                ...prev,
                stages,
                progress: Math.min(prev.progress + 2, 95),
              };
            });
          };

          const scheduleUpdate = () => {
            if (updateTimer) return;
            updateTimer = setTimeout(() => {
              updateTimer = null;
              flushUpdate();
            }, 100);
          };

          for await (const chunk of generator) {
            if (abortController.signal.aborted) break;
            enhancementText += chunk;
            pendingContent += chunk;
            chunkCount++;
            scheduleUpdate();
          }

          // Final flush
          if (updateTimer) clearTimeout(updateTimer);
          flushUpdate();

          if (!abortController.signal.aborted) {
            setState((prev) => {
              const stages = [...prev.stages];
              const enhanceIdx = stages.findIndex((s) => s.stage === "enhancement");
              if (enhanceIdx >= 0) {
                stages[enhanceIdx] = {
                  ...stages[enhanceIdx],
                  status: "complete",
                  content: enhancementText,
                  output: { stage: "enhancement", content: enhancementText },
                };
              }
              stages.push({
                stage: "finalize",
                status: "complete",
                content: enhancementText,
                tokens: [],
                output: { stage: "finalize", content: enhancementText },
              });
              return {
                ...prev,
                stages,
                finalPrompt: enhancementText,
                progress: 100,
                status: "complete",
              };
            });

            if (dbReady) {
              try {
                const saved = await saveSession({
                  mode,
                  transcript,
                  pipelineResults: [],
                  finalPrompt: enhancementText,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                if (saved?.id !== undefined) {
                  setState((prev) => ({ ...prev, savedSessionId: saved.id as number }));
                }
              } catch {}
            }
          }
        } catch (err: unknown) {
          if (!(err instanceof DOMException && err.name === "AbortError")) {
            setState((prev) => ({
              ...prev,
              status: "error",
              error: err instanceof Error ? err.message : "Unexpected error",
            }));
          }
        }
      })();
    },
    [dbReady, saveSession],
  );

  // ── Public API ─────────────────────────────────────────────────

  const generate = useCallback(
    (transcript: string, mode: PromptMode) => {
      if (runningRef.current) {
        abortRef.current?.abort();
      }

      runningRef.current = true;
      transcriptRef.current = transcript;
      modeRef.current = mode;

      setState({
        status: "running",
        stages: [],
        finalPrompt: "",
        error: null,
        progress: 0,
        savedSessionId: null,
        usingRealAI: false,
        pendingRequirements: null,
        pendingIntent: null,
      });

      // Try Groq first
      analyzeWithAPI(transcript, mode).then((success) => {
        if (success) {
          console.log("[usePromptGenerator] Analysis complete via API, waiting for confirmation");
        } else {
          console.log("[usePromptGenerator] API analysis failed, using mock...");
          const abortController = new AbortController();
          abortRef.current = abortController;
          analyzeWithMock(transcript, mode, abortController);
        }
      });

      cancelFnRef.current = () => {
        abortRef.current?.abort();
        runningRef.current = false;
        setState((prev) => {
          if (prev.status === "running" || prev.status === "confirming") {
            return { ...prev, status: "cancelled" as const };
          }
          return prev;
        });
      };
    },
    [analyzeWithAPI, analyzeWithMock],
  );

  const confirmRequirements = useCallback(
    (requirements: Requirements) => {
      const transcript = transcriptRef.current;
      const mode = modeRef.current;
      const intent = state.pendingIntent;

      if (!intent) {
        console.error("[usePromptGenerator] No pending intent to confirm");
        return;
      }

      console.log("[usePromptGenerator] Confirming requirements, starting enhancement...");

      setState((prev) => ({
        ...prev,
        status: "running",
        pendingRequirements: requirements,
        progress: 60,
      }));

      // Try Groq enhance first
      enhanceWithAPI(transcript, mode, intent, requirements).then((success) => {
        if (!success) {
          console.log("[usePromptGenerator] API enhance failed, using mock...");
          enhanceWithMock(transcript, mode, intent, requirements);
        }
      });
    },
    [enhanceWithAPI, enhanceWithMock, state.pendingIntent],
  );

  const regenerateRequirements = useCallback(() => {
    const transcript = transcriptRef.current;
    const mode = modeRef.current;

    setState((prev) => ({
      ...prev,
      status: "running",
      stages: [],
      progress: 0,
      pendingRequirements: null,
      pendingIntent: null,
    }));

    analyzeWithAPI(transcript, mode).then((success) => {
      if (!success) {
        const abortController = new AbortController();
        abortRef.current = abortController;
        analyzeWithMock(transcript, mode, abortController);
      }
    });
  }, [analyzeWithAPI, analyzeWithMock]);

  const cancel = useCallback(() => {
    cancelFnRef.current?.();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    cancelFnRef.current = null;
    runningRef.current = false;
    setState(INITIAL_STATE);
  }, []);

  const isRunning = state.status === "running";
  const isComplete = state.status === "complete";
  const isConfirming = state.status === "confirming";

  return {
    ...state,
    generate,
    confirmRequirements,
    regenerateRequirements,
    cancel,
    reset,
    isRunning,
    isComplete,
    isConfirming,
  };
}
