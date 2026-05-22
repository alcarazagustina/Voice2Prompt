// ── PipelineStep ─────────────────────────────────────────────────
// Reusable animated step card for a single pipeline stage.
// Handles pending, active (streaming), complete, and error states.

"use client";

import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  AlertCircle,
  Circle,
} from "lucide-react";
import { useStreamingUITokens } from "@/hooks/useStreamingUI";
import type { StageStatus } from "@/types";

// ── Types ────────────────────────────────────────────────────────

export interface PipelineStepProps {
  /** 1-based step number */
  stepNumber: number;
  /** Human-readable stage title */
  title: string;
  /** Current stage status */
  status: StageStatus;
  /** Streaming tokens for typewriter effect */
  tokens?: string[];
  /** Final content text (overrides tokens when complete) */
  content?: string;
  /** Custom content rendered above the streaming text */
  children?: React.ReactNode;
  /** Error message when status is "error" */
  error?: string;
  /** Delay before entrance animation (for stagger) */
  delay?: number;
}

// ── Component ────────────────────────────────────────────────────

export function PipelineStep({
  stepNumber,
  title,
  status,
  tokens = [],
  content,
  children,
  error,
  delay = 0,
}: PipelineStepProps) {
  const { displayedText, isComplete: streamComplete } =
    useStreamingUITokens(tokens, {
      charsPerTick: 2,
      tickInterval: 25,
    });

  const isPending = status === "pending";
  const isActive = status === "streaming";
  const isComplete = status === "complete";
  const isError = status === "error";

  // Decide what text to render
  const displayText = isComplete
    ? content || tokens.join("")
    : isActive
      ? displayedText
      : "";

  const hasContent = displayText.length > 0 && status !== "pending";

  // ── Status icon ───────────────────────────────────────────────
  const statusIcon = isPending ? (
    <Circle className="w-3.5 h-3.5 text-zinc-600" />
  ) : isActive ? (
    <motion.div
      animate={{ opacity: [1, 0.4, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      <Loader2 className="w-3.5 h-3.5 text-zinc-300 animate-spin" />
    </motion.div>
  ) : isComplete ? (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Check className="w-3.5 h-3.5 text-green-400" />
    </motion.div>
  ) : isError ? (
    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
  ) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isActive ? 1.01 : 1,
      }}
      transition={{
        delay,
        duration: 0.3,
        ease: "easeOut",
      }}
      className={`
        relative overflow-hidden rounded-xl border p-5 transition-colors duration-300
        ${isPending ? "bg-zinc-900/40 border-zinc-800" : ""}
        ${isActive ? "bg-zinc-900/80 border-zinc-600 shadow-lg shadow-zinc-900/50" : ""}
        ${isComplete ? "bg-zinc-900/60 border-zinc-700" : ""}
        ${isError ? "bg-red-950/20 border-red-800/50" : ""}
      `}
    >
      {/* Left status bar */}
      <div
        className={`
          absolute left-0 top-0 bottom-0 w-0.5 transition-colors duration-500
          ${isPending ? "bg-zinc-800" : ""}
          ${isActive ? "bg-zinc-400" : ""}
          ${isComplete ? "bg-green-500" : ""}
          ${isError ? "bg-red-500" : ""}
        `}
      />

      <div className="flex items-start gap-3">
        {/* Step number badge */}
        <div
          className={`
            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
            ${isPending ? "bg-zinc-800 text-zinc-500" : ""}
            ${isActive ? "bg-zinc-700 text-zinc-200" : ""}
            ${isComplete ? "bg-green-500/10 text-green-400" : ""}
            ${isError ? "bg-red-500/10 text-red-400" : ""}
          `}
        >
          {stepNumber}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header row */}
          <div className="flex items-center gap-2">
            <h3
              className={`
                text-sm font-medium
                ${isPending ? "text-zinc-500" : ""}
                ${isActive ? "text-zinc-200" : ""}
                ${isComplete ? "text-zinc-300" : ""}
                ${isError ? "text-red-300" : ""}
              `}
            >
              {title}
            </h3>
            <div className="ml-auto">{statusIcon}</div>
          </div>

          {/* Custom content (from wrapper components) */}
          {children}

          {/* Error message */}
          {isError && error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          {/* Streaming or completed content (only if no structured children) */}
          {hasContent && !children && (
            <div className="mt-2">
              <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                {displayText}
                {isActive && !streamComplete && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-1.5 h-3.5 bg-zinc-400 ml-0.5 align-text-bottom"
                  />
                )}
              </p>
            </div>
          )}

          {/* Processing placeholder for active stage with no tokens yet */}
          {isActive && tokens.length === 0 && (
            <p className="text-xs text-zinc-500 animate-pulse">
              Processing...
            </p>
          )}

          {/* Pending placeholder */}
          {isPending && (
            <p className="text-xs text-zinc-600">
              Waiting...
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
