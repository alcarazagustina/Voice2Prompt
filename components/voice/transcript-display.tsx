// ── TranscriptDisplay ────────────────────────────────────────────
// Shows the raw transcript after recording with edit + generate controls.

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Pencil, Sparkles, RotateCcw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface TranscriptDisplayProps {
  /** The transcript text to display */
  transcript: string;
  /** Called when the user edits the transcript */
  onEdit: (newTranscript: string) => void;
  /** Called when the user clicks "Generate Prompt" */
  onGeneratePrompt: () => void;
  /** Called when the user wants to discard and re-record */
  onCancel: () => void;
  /** Whether the pipeline is currently generating */
  isGenerating?: boolean;
}

// ── Component ────────────────────────────────────────────────────

export function TranscriptDisplay({
  transcript,
  onEdit,
  onGeneratePrompt,
  onCancel,
  isGenerating = false,
}: TranscriptDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(transcript);

  const handleSave = () => {
    onEdit(editText);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(transcript);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">
            Transcript
          </span>
        </div>

        {isEditing ? (
          /* ── Edit Mode ─────────────────────────────────────── */
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full min-h-[100px] bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-500 resize-y focus:outline-none focus:ring-1 focus:ring-zinc-500 transition-colors"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          /* ── Display Mode ──────────────────────────────────── */
          <div className="space-y-4">
            <blockquote className="text-sm text-zinc-300 leading-relaxed border-l-2 border-zinc-600 pl-4 italic">
              &ldquo;{transcript}&rdquo;
            </blockquote>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditText(transcript);
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={onCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Record again
                </button>
              </div>

              <button
                onClick={onGeneratePrompt}
                disabled={isGenerating || !transcript.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGenerating ? "Generating..." : "Generate Prompt"}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
