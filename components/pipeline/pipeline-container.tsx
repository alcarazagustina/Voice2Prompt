// ── PipelineContainer ────────────────────────────────────────────
// Orchestrates the full pipeline visualization with confirmation step.
// Two-phase: Analyze → Confirm → Enhance

"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, Check, RotateCcw } from "lucide-react";
import { usePromptGenerator } from "@/hooks/usePromptGenerator";
import { IntentAnalysis } from "./intent-analysis";
import { RequirementsExtraction } from "./requirements-extraction";
import { PromptEnhancement } from "./prompt-enhancement";
import { FinalPrompt } from "./final-prompt";
import type { PromptMode, PipelineStageResult, Requirements } from "@/types";

// ── Types ────────────────────────────────────────────────────────

interface PipelineContainerProps {
  transcript: string;
  mode: PromptMode;
  onComplete?: (finalPrompt: string) => void;
  onError?: (error: string) => void;
}

function findStage(stages: PipelineStageResult[], name: string) {
  return stages.find((s) => s.stage === name);
}

// ── Component ────────────────────────────────────────────────────

export function PipelineContainer({
  transcript,
  mode,
  onComplete,
  onError,
}: PipelineContainerProps) {
  const {
    status,
    stages,
    finalPrompt,
    error,
    isRunning,
    isComplete,
    isConfirming,
    pendingRequirements,
    pendingIntent,
    generate,
    confirmRequirements,
    regenerateRequirements,
    cancel,
  } = usePromptGenerator();

  const hasStartedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-start
  useEffect(() => {
    if (transcript.trim() && !hasStartedRef.current) {
      hasStartedRef.current = true;
      generate(transcript, mode);
    }
  }, [transcript, mode, generate]);

  // Callbacks
  useEffect(() => {
    if (isComplete && finalPrompt) onComplete?.(finalPrompt);
  }, [isComplete, finalPrompt, onComplete]);

  useEffect(() => {
    if (status === "error" && error) onError?.(error);
  }, [status, error, onError]);

  // Scroll
  const runningIdx = stages.findIndex((s) => s.status === "streaming");
  useEffect(() => {
    if (containerRef.current && runningIdx >= 0) {
      const cards = containerRef.current.querySelectorAll("[data-pipeline-step]");
      if (cards[runningIdx + 1]) {
        cards[runningIdx + 1].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [runningIdx]);

  if (!transcript.trim()) return null;

  const intentStage = findStage(stages, "intent");
  const reqsStage = findStage(stages, "requirements");
  const enhanceStage = findStage(stages, "enhancement");
  const finalizeStage = findStage(stages, "finalize");

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto space-y-3">
      {/* Raw Transcript */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
        data-pipeline-step
      >
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500" />
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-zinc-300 mb-2">Raw Transcript</h3>
            <p className="text-xs text-zinc-500 leading-relaxed border-l-2 border-zinc-700 pl-3 italic">
              &ldquo;{transcript}&rdquo;
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {(stages.length > 0 || isRunning) && (
          <motion.div key="pipeline-ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            {/* Intent */}
            {intentStage && (
              <div data-pipeline-step>
                <IntentAnalysis status={intentStage.status} tokens={intentStage.tokens} content={intentStage.content} output={intentStage.output} delay={0.15} />
              </div>
            )}

            {/* Requirements — editable when confirming */}
            {reqsStage && (
              <div data-pipeline-step>
                <RequirementsExtraction
                  status={isConfirming ? "complete" : reqsStage.status}
                  tokens={reqsStage.tokens}
                  content={reqsStage.content}
                  output={reqsStage.output}
                  isConfirming={isConfirming}
                  editableRequirements={pendingRequirements ?? undefined}
                  onConfirm={confirmRequirements}
                  onRegenerate={regenerateRequirements}
                  delay={0.3}
                />
              </div>
            )}

            {/* Enhancement */}
            {enhanceStage && (
              <div data-pipeline-step>
                <PromptEnhancement status={enhanceStage.status} tokens={enhanceStage.tokens} content={enhanceStage.content} output={enhanceStage.output} delay={0.45} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Final Prompt */}
      <AnimatePresence>
        {finalizeStage?.status === "complete" && finalPrompt && (
          <div data-pipeline-step>
            <FinalPrompt content={finalPrompt} mode={mode} delay={0.6} />
          </div>
        )}
      </AnimatePresence>

      {/* Cancel / Retry */}
      <AnimatePresence>
        {isRunning && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex justify-center pt-2">
            <button onClick={cancel} className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors">
              <Ban className="w-3.5 h-3.5" />
              Cancel Pipeline
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {status === "error" && error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-red-950/20 border border-red-800/50 rounded-xl p-4 text-center">
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={() => { hasStartedRef.current = false; generate(transcript, mode); }} className="px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors flex items-center gap-1.5 mx-auto">
              <RotateCcw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
