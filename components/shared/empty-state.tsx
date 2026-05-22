// ── EmptyState ────────────────────────────────────────────────────
// Reusable empty state component with icon, title, description, and optional action.

"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Icon component from lucide-react */
  icon: LucideIcon;
  /** Primary heading text */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ── Component ────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-zinc-500" />
      </div>
      <h3 className="text-sm font-medium text-zinc-300 mb-2">{title}</h3>
      <p className="text-xs text-zinc-500 max-w-xs mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors min-h-[44px]"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}
