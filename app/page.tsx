// ── Main Page ─────────────────────────────────────────────────────
// Landing + main app interface — single scrollable page with hero,
// mode selector, voice recorder, pipeline, and features grid.

"use client";

import { useState, useCallback, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import {
  Zap,
  Brain,
  Layers,
  Download,
  Shield,
  Code,
  Mic,
} from "lucide-react";
import { VoiceRecorder } from "@/components/voice/voice-recorder";
import { ModeSelector } from "@/components/shared/mode-selector";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { PipelineContainer } from "@/components/pipeline/pipeline-container";
import type { PromptMode } from "@/types";

// ── Constants ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "From voice to structured prompt in seconds with real-time streaming.",
  },
  {
    icon: Brain,
    title: "AI-Powered",
    description: "Intelligent intent analysis and requirement extraction for better prompts.",
  },
  {
    icon: Layers,
    title: "Multiple Modes",
    description: "Frontend, SaaS, automation, design, or fullstack — one mode for every need.",
  },
  {
    icon: Download,
    title: "Export Ready",
    description: "Copy, edit, or export your prompts as Markdown files instantly.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Everything runs locally in your browser. Zero server uploads.",
  },
  {
    icon: Code,
    title: "Open Source",
    description: "Built with Next.js, TypeScript, and shadcn/ui. Fully customizable.",
  },
];

// ── Feature Card ──────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof Zap;
  title: string;
  description: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      className="group relative rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700/80 transition-colors will-change-transform"
    >
      <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-3 group-hover:border-zinc-600 transition-colors">
        <Icon className="w-4 h-4 text-zinc-400" />
      </div>
      <h3 className="text-sm font-medium text-zinc-200 mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────────

export default function Home() {
  const [transcript, setTranscript] = useState("");
  const [mode, setMode] = useState<PromptMode>("frontend");
  const [pipelineKey, setPipelineKey] = useState(0);
  const pipelineRef = useRef<HTMLDivElement>(null);

  const handleTranscriptReady = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  const handleGeneratePrompt = useCallback((text: string) => {
    setTranscript(text);
    setPipelineKey((k) => k + 1);
    // Scroll to pipeline after a short delay
    setTimeout(() => {
      pipelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handlePipelineComplete = useCallback(() => {
    // Could trigger celebration here
  }, []);

  return (
    <div className="flex flex-col items-center">
      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="w-full flex flex-col items-center pt-20 sm:pt-28 pb-12 px-4 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-4">
            <span className="text-gradient">
              Turn messy spoken ideas
            </span>
            <br />
            <span className="text-zinc-100">
              into structured AI-ready prompts.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 max-w-lg mx-auto leading-relaxed">
            Record your voice, choose a mode, and get a production-ready prompt
            in seconds. No typing required.
          </p>
        </motion.div>
      </section>

      {/* ── Mode Selector ─────────────────────────────────────── */}
      <section className="w-full pb-8 px-4 sm:px-8">
        <ModeSelector selectedMode={mode} onModeChange={setMode} />
      </section>

      {/* ── Voice Input ───────────────────────────────────────── */}
      <section className="w-full pb-10 px-4 sm:px-8">
        <ErrorBoundary>
          <VoiceRecorder
            onTranscriptReady={handleTranscriptReady}
            onGeneratePrompt={handleGeneratePrompt}
          />
        </ErrorBoundary>
      </section>

      {/* ── Pipeline Display ──────────────────────────────────── */}
      <section ref={pipelineRef} className="w-full pb-16 px-4 sm:px-8">
        <AnimatePresence mode="wait">
          {transcript.trim() ? (
            <motion.div
              key={pipelineKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <ErrorBoundary>
                <PipelineContainer
                  transcript={transcript}
                  mode={mode}
                  onComplete={handlePipelineComplete}
                />
              </ErrorBoundary>
            </motion.div>
          ) : (
            <EmptyState
              icon={Mic}
              title="Ready when you are"
              description="Record your voice or type an idea to get started."
            />
          )}
        </AnimatePresence>
      </section>

      {/* ── Features Grid ─────────────────────────────────────── */}
      <section className="w-full pb-20 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-zinc-200">
              Everything you need to craft better prompts
            </h2>
            <p className="text-xs text-zinc-500 mt-2">
              Built for developers who think out loud.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
