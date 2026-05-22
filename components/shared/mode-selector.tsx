// ── ModeSelector ──────────────────────────────────────────────────
// Segmented pill control for selecting prompt generation mode.
// 5 modes with icons, animated active indicator via framer-motion layoutId.

"use client";

import { motion } from "framer-motion";
import { Layout, Cloud, Cog, Palette, Layers } from "lucide-react";
import type { PromptMode } from "@/types";

// ── Types ────────────────────────────────────────────────────────

interface ModeSelectorProps {
  /** Currently selected mode */
  selectedMode: PromptMode;
  /** Called when a mode is selected */
  onModeChange: (mode: PromptMode) => void;
}

// ── Constants ────────────────────────────────────────────────────

interface ModeOption {
  mode: PromptMode;
  label: string;
  icon: React.ReactNode;
}

const MODES: ModeOption[] = [
  { mode: "frontend", label: "Frontend", icon: <Layout className="w-3.5 h-3.5" /> },
  { mode: "saas", label: "SaaS", icon: <Cloud className="w-3.5 h-3.5" /> },
  { mode: "automation", label: "Automation", icon: <Cog className="w-3.5 h-3.5" /> },
  { mode: "design", label: "Design", icon: <Palette className="w-3.5 h-3.5" /> },
  { mode: "fullstack", label: "Fullstack", icon: <Layers className="w-3.5 h-3.5" /> },
];

// ── Component ────────────────────────────────────────────────────

export function ModeSelector({ selectedMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5 p-1 bg-zinc-800/50 rounded-full border border-zinc-700/50 w-fit mx-auto">
      {MODES.map(({ mode, label, icon }) => {
        const isActive = selectedMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors min-h-[44px] min-w-[44px] ${
              isActive
                ? "text-zinc-900"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="active-mode"
                className="absolute inset-0 bg-zinc-200 rounded-full"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
