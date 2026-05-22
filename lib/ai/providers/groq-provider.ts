// ── Groq Provider ─────────────────────────────────────────────────
// Server-side only — calls Groq API (OpenAI-compatible) for each
// pipeline stage. Uses llama-3.1-8b for analysis and
// llama-3.3-70b for prompt generation.

import OpenAI from "openai";
import type { IntentAnalysis, Requirements, PromptMode } from "@/types";

// ── Client ────────────────────────────────────────────────────────

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

// We use two models: fast one for structured extraction, powerful one for generation
const ANALYSIS_MODEL = "llama-3.1-8b-instant";
const GENERATION_MODEL = "llama-3.3-70b-versatile";

// ── Intent Analysis ───────────────────────────────────────────────

const INTENT_SYSTEM_PROMPT = `You are an expert AI prompt engineer and product analyst.
Analyze the user's project description and return ONLY valid JSON in this exact format:

{
  "mode": "frontend" | "saas" | "automation" | "design" | "fullstack",
  "label": "Short human-readable project type label",
  "confidence": 0.85,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reasoning": "One sentence explaining why this classification was chosen"
}

mode must be exactly one of: frontend, saas, automation, design, fullstack.
Return ONLY the JSON object. No markdown, no backticks, no explanation.`;

export async function analyzeIntentWithGroq(
  transcript: string,
): Promise<IntentAnalysis> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      { role: "user", content: transcript },
    ],
    temperature: 0.3,
    max_tokens: 300,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      mode: PromptMode;
      label: string;
      confidence: number;
      keywords: string[];
      reasoning: string;
    };

    return {
      stage: "intent",
      mode: parsed.mode ?? "fullstack",
      label: parsed.label ?? "Fullstack Application",
      confidence: parsed.confidence ?? 0.5,
      keywords: parsed.keywords ?? [],
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return {
      stage: "intent",
      mode: "fullstack",
      label: "Fullstack Application",
      confidence: 0.5,
      keywords: transcript.split(" ").slice(0, 5),
      reasoning: "Fallback — could not parse AI response",
    };
  }
}

// ── Requirements Extraction ────────────────────────────────────────

const REQUIREMENTS_SYSTEM_PROMPT = `You are an expert product manager and technical lead.
Extract ONLY requirements explicitly mentioned or directly implied by the user's description.
Do NOT invent features the user did not ask for. Stick strictly to what was said.

Tech stack: ONLY include technologies the user named. If they said "Next.js and TypeScript", DO include TailwindCSS if appropriate for "minimalist" or "modern" design, but do NOT add random frameworks.

Features: ONLY include features the user explicitly described. If they said "landing page", do NOT add "ordering system" or "reservations" unless they mentioned them. A landing page is informational — not a full app.

Constraints: Only include constraints the user mentioned or that are genuinely implied (e.g., "responsive" if they said "mobile").

Return ONLY valid JSON:
{
  "techStack": ["Next.js", "TypeScript"],
  "features": ["Dark mode", "Pet-friendly section"],
  "constraints": ["Must be responsive"],
  "reasoning": "Brief technical reasoning"
}

Be conservative. Less is more. Return ONLY the JSON. No markdown, no backticks.`;

export async function extractRequirementsWithGroq(
  transcript: string,
  intent: IntentAnalysis,
): Promise<Requirements> {
  const client = getClient();

  const completion = await client.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      { role: "system", content: REQUIREMENTS_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Project type: ${intent.mode} (${intent.label}, ${Math.round(intent.confidence * 100)}% confidence)\nKeywords: ${intent.keywords.join(", ")}\n\nDescription: ${transcript}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      techStack: string[];
      features: string[];
      constraints: string[];
      reasoning: string;
    };

    return {
      stage: "requirements",
      techStack: parsed.techStack ?? [],
      features: parsed.features ?? [],
      constraints: parsed.constraints ?? [],
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return {
      stage: "requirements",
      techStack: [],
      features: [transcript],
      constraints: [],
      reasoning: "Fallback — could not parse AI response",
    };
  }
}

// ── Prompt Enhancement (Streaming) ─────────────────────────────────

const ENHANCE_SYSTEM_PROMPT = `You are an expert AI prompt engineer. Generate a comprehensive, production-ready markdown prompt for an AI coding assistant (Cursor, Claude, v0, Lovable, GPT).

The prompt must be detailed enough that an AI coding assistant can immediately start building the project.

Structure your response with these sections using markdown headers:

1. ## Project Overview — Clear one-paragraph description
2. ## Tech Stack — Specific technologies with versions
3. ## Architecture — Component hierarchy, folder structure, data flow
4. ## Feature Specifications — Detailed acceptance criteria for each feature
5. ## Design System — Colors (hex), typography, spacing, components
6. ## Responsive Design — Breakpoints, mobile-first approach
7. ## Accessibility — WCAG 2.1 AA, semantic HTML, ARIA
8. ## Implementation Order — Step-by-step build sequence
9. ## Edge Cases — Error states, loading, empty states
10. ## Testing Strategy — Unit, integration, E2E

Be technically specific and actionable. Use bullet points, tables, and code hints.`;

export async function* enhancePromptWithGroq(
  transcript: string,
  intent: IntentAnalysis,
  requirements: Requirements,
  _mode: PromptMode,
): AsyncGenerator<string> {
  const client = getClient();

  const stream = await client.chat.completions.create({
    model: GENERATION_MODEL,
    messages: [
      { role: "system", content: ENHANCE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Build a detailed AI prompt for this project:\n\nDescription: ${transcript}\n\nType: ${intent.mode} (${intent.label})\nKeywords: ${intent.keywords.join(", ")}\n\nTech Stack: ${requirements.techStack.join(", ")}\nFeatures: ${requirements.features.join(", ")}\nConstraints: ${requirements.constraints.join(", ")}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
