// ── RequirementsExtraction ────────────────────────────────────────
// Shows structured requirements. Has Edit mode toggle + Confirm.

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil, Plus, X } from "lucide-react";
import { PipelineStep } from "./pipeline-step";
import type { StageStatus, StageOutput, Requirements } from "@/types";

interface RequirementsExtractionProps {
  status: StageStatus;
  tokens?: string[];
  content?: string;
  output?: StageOutput | null;
  error?: string;
  delay?: number;
  isConfirming?: boolean;
  editableRequirements?: Requirements;
  onConfirm?: (requirements: Requirements) => void;
  onRegenerate?: () => void;
}

export function RequirementsExtraction({
  status,
  tokens = [],
  content,
  output,
  error,
  delay,
  isConfirming,
  editableRequirements,
  onConfirm,
  onRegenerate,
}: RequirementsExtractionProps) {
  const reqs = (editableRequirements ?? output) as Requirements | null;
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<Requirements | null>(null);

  if (!reqs) {
    return (
      <PipelineStep
        stepNumber={3}
        title="Requirements Extraction"
        status={status}
        tokens={tokens}
        content={content}
        error={error}
        delay={delay}
      />
    );
  }

  // Use edited version if in editing mode
  const data = isEditing ? (edited ?? reqs) : reqs;

  const startEditing = () => {
    setEdited(structuredClone(reqs));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEdited(null);
  };

  const handleConfirm = () => {
    const toConfirm = isEditing ? (edited ?? reqs) : reqs;
    const cleaned: Requirements = {
      ...toConfirm,
      techStack: toConfirm.techStack.filter(Boolean),
      features: toConfirm.features.filter(Boolean),
      constraints: toConfirm.constraints.filter(Boolean),
    };
    onConfirm?.(cleaned);
  };

  // ── Edit helpers ──────────────────────────────────────────────
  const updateTech = (i: number, v: string) => {
    const n = { ...data, techStack: [...data.techStack] };
    n.techStack[i] = v;
    setEdited(n);
  };
  const addTech = () => setEdited({ ...data, techStack: [...data.techStack, ""] });
  const removeTech = (i: number) => setEdited({ ...data, techStack: data.techStack.filter((_, j) => j !== i) });

  const updateFeat = (i: number, v: string) => {
    const n = { ...data, features: [...data.features] };
    n.features[i] = v;
    setEdited(n);
  };
  const addFeat = () => setEdited({ ...data, features: [...data.features, ""] });
  const removeFeat = (i: number) => setEdited({ ...data, features: data.features.filter((_, j) => j !== i) });

  const updateCons = (i: number, v: string) => {
    const n = { ...data, constraints: [...data.constraints] };
    n.constraints[i] = v;
    setEdited(n);
  };
  const addCons = () => setEdited({ ...data, constraints: [...data.constraints, ""] });
  const removeCons = (i: number) => setEdited({ ...data, constraints: data.constraints.filter((_, j) => j !== i) });

  // ── Shared field component ────────────────────────────────────
  const inputClass = "text-[11px] px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded focus:outline-none focus:border-zinc-500";
  const inputClassWide = "text-xs bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-1 focus:outline-none focus:border-zinc-500";

  return (
    <PipelineStep
      stepNumber={3}
      title="Requirements Extraction"
      status={isConfirming && !isEditing ? "complete" : status}
      tokens={tokens}
      content={content}
      error={error}
      delay={delay}
    >
      <div className="space-y-4 mt-2">
        {/* Tech Stack */}
        {data.techStack.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Tech Stack</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {data.techStack.map((tech, i) =>
                isEditing ? (
                  <div key={i} className="flex items-center gap-1">
                    <input value={tech} onChange={(e) => updateTech(i, e.target.value)} className={`${inputClass} w-24`} />
                    <button onClick={() => removeTech(i)} className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <span key={i} className="text-[11px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">{tech}</span>
                ),
              )}
              {isEditing && (
                <button onClick={addTech} className="text-[11px] px-2 py-0.5 border border-dashed border-zinc-700 text-zinc-500 rounded hover:text-zinc-300 hover:border-zinc-500 flex items-center gap-1">
                  <Plus className="w-3 h-3" />Add
                </button>
              )}
            </div>
          </div>
        )}

        {/* Features */}
        {data.features.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-green-500">Must-haves</span>
            <ul className="mt-1.5 space-y-1.5">
              {data.features.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-green-500 mt-0.5 shrink-0 text-[10px]">●</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input value={f} onChange={(e) => updateFeat(i, e.target.value)} className={`${inputClassWide} flex-1`} />
                      <button onClick={() => removeFeat(i)} className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">{f}</span>
                  )}
                </li>
              ))}
              {isEditing && (
                <li>
                  <button onClick={addFeat} className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"><Plus className="w-3 h-3" />Add feature</button>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Constraints */}
        {data.constraints.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-amber-500">Constraints</span>
            <ul className="mt-1.5 space-y-1.5">
              {data.constraints.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5 shrink-0 text-[10px]">◆</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input value={c} onChange={(e) => updateCons(i, e.target.value)} className={`${inputClassWide} flex-1`} />
                      <button onClick={() => removeCons(i)} className="text-zinc-600 hover:text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">{c}</span>
                  )}
                </li>
              ))}
              {isEditing && (
                <li>
                  <button onClick={addCons} className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"><Plus className="w-3 h-3" />Add constraint</button>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        {isConfirming && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 pt-3 border-t border-zinc-800"
          >
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm & Generate
            </button>
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
              >
                Regenerate
              </button>
            )}
          </motion.div>
        )}

        {/* Edit mode actions */}
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 pt-3 border-t border-zinc-800"
          >
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-2 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm & Generate
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center gap-1.5 px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/80 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </div>
    </PipelineStep>
  );
}
