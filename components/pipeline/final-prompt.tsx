// ── FinalPrompt ──────────────────────────────────────────────────
// The final output card — premium design with copy, edit, export,
// regenerate actions, word count, and mode badge.

"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Download,
  Edit3,
  RefreshCw,
  Save,
} from "lucide-react";
import { downloadFile } from "@/lib/utils";
import type { PromptMode } from "@/types";

// ── Types ────────────────────────────────────────────────────────

interface FinalPromptProps {
  /** The final generated prompt text */
  content: string;
  /** The mode used for generation */
  mode: PromptMode;
  /** Called when the user wants to regenerate */
  onRegenerate?: () => void;
  /** Delay before entrance animation */
  delay?: number;
}

// ── Constants ────────────────────────────────────────────────────

const MODE_LABELS: Record<PromptMode, string> = {
  frontend: "Frontend mode",
  saas: "SaaS mode",
  automation: "Automation mode",
  design: "Design mode",
  fullstack: "Fullstack mode",
};

// ── Component ────────────────────────────────────────────────────

export function FinalPrompt({
  content,
  mode,
  onRegenerate,
  delay = 0,
}: FinalPromptProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(content);

  const wordCount = content.trim()
    ? content.trim().split(/\s+/).length
    : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // ── Handlers ──────────────────────────────────────────────────

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [content]);

  const handleExport = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(content, `prompt-${timestamp}.md`);
  }, [content]);

  const handleEditSave = useCallback(() => {
    // Parent can wire up persistence if needed; for now just toggle
    setIsEditing(false);
  }, []);

  // ── Render ────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-900/50 p-6 shadow-xl hover:border-zinc-600/80 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-green-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-200">
            Final Prompt
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-zinc-800 text-zinc-400 rounded-full">
          {MODE_LABELS[mode]}
        </span>
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="w-full min-h-[200px] bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-xs font-mono text-zinc-300 leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      ) : (
        <div className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-4 max-h-[400px] overflow-y-auto">
          <pre className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {content}
          </pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500">
            {wordCount} words &middot; {readingTime} min read
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setEditText(content);
                  setIsEditing(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-colors"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </>
          ) : (
            <>
              {/* Edit */}
              <button
                onClick={() => {
                  setEditText(content);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all hover:scale-102 active:scale-95 will-change-transform"
                title="Edit prompt"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>

              {/* Copy */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-all bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:scale-102 active:scale-95 will-change-transform"
                title="Copy to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-all hover:scale-102 active:scale-95 will-change-transform"
                title="Export as .md"
              >
                <Download className="w-3 h-3" />
                Export
              </button>

              {/* Regenerate */}
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-zinc-100 text-zinc-900 rounded-lg hover:bg-zinc-200 transition-all font-medium hover:scale-102 active:scale-95 will-change-transform"
                  title="Regenerate prompt"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
