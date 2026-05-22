// ── RecordingWaveform ────────────────────────────────────────────
// Animated audio visualization bars shown during recording.

"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────

interface RecordingWaveformProps {
  /** Whether the waveform should animate */
  isActive: boolean;
}

// ── Constants ────────────────────────────────────────────────────

const BAR_COUNT = 24;

interface BarConfig {
  index: number;
  minHeight: number;
  maxHeight: number;
  delay: number;
  duration: number;
}

function generateBars(): BarConfig[] {
  return Array.from({ length: BAR_COUNT }, (_, i) => ({
    index: i,
    minHeight: 6 + Math.random() * 10,
    maxHeight: 32 + Math.random() * 40,
    delay: i * 0.04,
    duration: 0.6 + Math.random() * 0.8,
  }));
}

// ── Component ────────────────────────────────────────────────────

export function RecordingWaveform({ isActive }: RecordingWaveformProps) {
  const bars = useMemo(() => generateBars(), []);

  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {bars.map((bar) => (
        <motion.div
          key={bar.index}
          className="w-[3px] rounded-full bg-gradient-to-t from-zinc-600/60 to-zinc-400/80"
          animate={{
            height: isActive
              ? [bar.minHeight, bar.maxHeight, bar.minHeight]
              : bar.minHeight,
          }}
          transition={{
            duration: bar.duration,
            repeat: Infinity,
            delay: bar.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
