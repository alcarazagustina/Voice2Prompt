// ── VoiceRecorder ─────────────────────────────────────────────────
// The main voice input component — THE hero element of the app.
// Handles all recording states: idle → requesting → recording →
// transcribing → transcriptReady, plus error and unsupported fallback.

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Square,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { RecordingWaveform } from "./recording-waveform";
import { TranscriptDisplay } from "./transcript-display";

// ── Types ────────────────────────────────────────────────────────

interface VoiceRecorderProps {
  /** Called when the transcript is ready (after edit or initial capture) */
  onTranscriptReady: (transcript: string) => void;
  /** Called when the user clicks "Generate Prompt" */
  onGeneratePrompt: (transcript: string) => void;
  /** Whether the pipeline is currently generating */
  isGenerating?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export function VoiceRecorder({
  onTranscriptReady,
  onGeneratePrompt,
  isGenerating = false,
}: VoiceRecorderProps) {
  const [language, setLanguage] = useState<"auto" | "en-US" | "es">("auto");

  const {
    state,
    transcript,
    interimTranscript,
    isSupported,
    isRecording,
    error,
    startRecording,
    stopRecording,
    reset,
  } = useVoiceRecorder({
    language: language === "auto" ? undefined : language,
  });

  const [manualText, setManualText] = useState("");

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleTranscriptEdit = useCallback(
    (newTranscript: string) => {
      onTranscriptReady(newTranscript);
    },
    [onTranscriptReady],
  );

  const handleGeneratePrompt = useCallback(() => {
    const text = transcript || manualText;
    if (text.trim()) {
      onGeneratePrompt(text);
    }
  }, [transcript, manualText, onGeneratePrompt]);

  // ── Unsupported Fallback ──────────────────────────────────────
  if (!isSupported) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-400">
              Speech recognition not available
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">
            Your browser doesn&apos;t support the Web Speech API. Type your
            prompt description below instead.
          </p>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Describe what you want to build..."
            className="w-full min-h-[120px] bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 text-sm text-zinc-200 placeholder:text-zinc-500 resize-y focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
          />
          <div className="flex justify-center mt-4">
            <button
              onClick={() => onGeneratePrompt(manualText)}
              disabled={!manualText.trim() || isGenerating}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isGenerating ? "Generating..." : "Generate Prompt"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isIdle = state === "idle";
  const isRequesting = state === "requesting";
  const isTranscribing = state === "transcribing";
  const isTranscriptReady = state === "transcriptReady";
  const isErrorState = state === "error";

  const showTranscript =
    isTranscriptReady || isTranscribing || (isErrorState && transcript.length > 0);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
      {/* Language Toggle */}
      {isIdle && (
        <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded-full p-0.5">
          <button
            onClick={() => setLanguage("es")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              language === "es" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            ES
          </button>
          <button
            onClick={() => setLanguage("auto")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              language === "auto" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setLanguage("en-US")}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              language === "en-US" ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            EN
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Error State (no transcript) ─────────────────────── */}
        {isErrorState && !transcript ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <p className="text-sm text-red-400 text-center max-w-xs">
              {error?.message ?? "An error occurred"}
            </p>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </motion.div>
        ) : null}

        {/* ── Idle State ──────────────────────────────────────── */}
        {isIdle ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.button
              onClick={handleMicClick}
              className="relative w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center cursor-pointer group hover:border-zinc-500 transition-colors min-h-[44px] min-w-[44px]"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(161, 161, 170, 0.1)",
                  "0 0 0 12px rgba(161, 161, 170, 0.04)",
                  "0 0 0 0 rgba(161, 161, 170, 0.1)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
            </motion.button>
            <p className="text-xs text-zinc-500">Click to record</p>
          </motion.div>
        ) : null}

        {/* ── Recording State ─────────────────────────────────── */}
        {isRecording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.button
              onClick={handleMicClick}
              className="relative w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full bg-zinc-900 border-2 border-red-500/50 flex items-center justify-center cursor-pointer group"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(239, 68, 68, 0.4)",
                  "0 0 0 16px rgba(239, 68, 68, 0.1)",
                  "0 0 0 0 rgba(239, 68, 68, 0.4)",
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Square className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
            </motion.button>
            <p className="text-xs text-red-400 animate-pulse">
              Recording...
            </p>

            <RecordingWaveform isActive={isRecording} />

            {interimTranscript && (
              <p className="text-xs text-zinc-500 text-center max-w-md italic">
                {interimTranscript}
              </p>
            )}
          </motion.div>
        ) : null}

        {/* ── Processing States ───────────────────────────────── */}
        {(isRequesting || isTranscribing) && !isRecording ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-24 h-24 sm:w-[120px] sm:h-[120px] rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center">
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-400 animate-spin" />
            </div>
            <p className="text-xs text-zinc-500">
              {isRequesting
                ? "Accessing microphone..."
                : "Transcribing..."}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Transcript Display ─────────────────────────────────── */}
      <AnimatePresence>
        {showTranscript && (
          <TranscriptDisplay
            transcript={transcript}
            onEdit={handleTranscriptEdit}
            onGeneratePrompt={handleGeneratePrompt}
            onCancel={reset}
            isGenerating={isGenerating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
