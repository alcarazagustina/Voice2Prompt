// ── History Page ──────────────────────────────────────────────────
// Browse past sessions with grid of cards, detail modal, and delete.

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Trash2,
  Eye,
  X,
  Clock,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useIndexedDB } from "@/hooks/useIndexedDB";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonCard } from "@/components/shared/skeleton-card";
import { formatDate } from "@/lib/utils";
import type { Session } from "@/types";

// ── Constants ────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  frontend: "Frontend",
  saas: "SaaS",
  automation: "Automation",
  design: "Design",
  fullstack: "Fullstack",
};

// ── Component ────────────────────────────────────────────────────

export default function HistoryPage() {
  const { status, getAllSessions, deleteSession } = useIndexedDB();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  // ── Load sessions ────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (status !== "ready") return;
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch {
      // Error state handled by status field
    }
  }, [status, getAllSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Delete handler ───────────────────────────────────────────
  const handleDelete = useCallback(
    async (id: number) => {
      try {
        await deleteSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        setConfirmDelete(null);
        if (selectedSession?.id === id) setSelectedSession(null);
      } catch {
        // Silently fail — state remains consistent
      }
    },
    [deleteSession, selectedSession],
  );

  const isLoading = status === "loading";
  const isError = status === "error";
  const isEmpty = !isLoading && !isError && sessions.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
        <h1 className="text-lg font-semibold tracking-tight text-zinc-200">
          Prompt History
        </h1>
      </div>

      {/* ── Loading State ──────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────── */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-medium text-zinc-300 mb-2">
            Could not load history
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs">
            Check your browser storage or try refreshing the page.
          </p>
          <button
            onClick={loadSessions}
            className="mt-6 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors min-h-[44px]"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────── */}
      {isEmpty && (
        <EmptyState
          icon={Clock}
          title="No prompts yet"
          description="Start by recording your first idea!"
          action={{ label: "Record an idea", onClick: () => window.location.href = "/" }}
        />
      )}

      {/* ── Sessions Grid ──────────────────────────────────────── */}
      {!isLoading && !isError && sessions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {sessions.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700/80 transition-colors"
              >
                {/* Mode badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                    {MODE_LABELS[session.mode] ?? session.mode}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatDate(new Date(session.createdAt))}
                  </span>
                </div>

                {/* Transcript preview */}
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                  &ldquo;{session.transcript.slice(0, 100)}
                  {session.transcript.length > 100 ? "..." : ""}&rdquo;
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSession(session)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>

                  {confirmDelete === session.id ? (
                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleDelete(session.id!)}
                        className="px-2 py-1.5 text-[10px] bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(session.id!)}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1.5 text-[10px] text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Detail Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedSession(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md p-6 shadow-2xl"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedSession(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>

              {/* Mode + Date */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                  {MODE_LABELS[selectedSession.mode] ?? selectedSession.mode}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {formatDate(new Date(selectedSession.createdAt))}
                </span>
              </div>

              {/* Transcript */}
              <div className="mb-4">
                <h4 className="text-xs font-medium text-zinc-400 mb-1.5">
                  Transcript
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed border-l-2 border-zinc-700 pl-3 italic">
                  &ldquo;{selectedSession.transcript}&rdquo;
                </p>
              </div>

              {/* Final Prompt */}
              <div>
                <h4 className="text-xs font-medium text-zinc-400 mb-1.5">
                  Final Prompt
                </h4>
                <div className="bg-zinc-800/50 border border-zinc-800 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedSession.finalPrompt}
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
