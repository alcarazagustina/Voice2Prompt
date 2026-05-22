// ── Gemini Provider ───────────────────────────────────────────────
// Server-side only — calls Gemini Flash API for each pipeline stage.
// Uses @google/generative-ai SDK with structured output for analysis
// and streaming for prompt generation.

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { IntentAnalysis, Requirements, PromptMode } from "@/types";

// ── Initialization ────────────────────────────────────────────────

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 4096,
    },
  });
}

// ── Intent Analysis ───────────────────────────────────────────────

const INTENT_ANALYSIS_PROMPT = `You are an expert AI prompt engineer and product analyst. Analyze the user's project description and return structured intent data.

Return ONLY valid JSON in this format (no markdown, no backticks):
{
  "mode": "frontend" | "saas" | "automation" | "design" | "fullstack",
  "label": "Short human-readable project type label",
  "confidence": 0.85,
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "reasoning": "One sentence explaining why this classification was chosen"
}

mode must be exactly one of: frontend, saas, automation, design, fullstack.

User description:`;

export async function analyzeIntentWithGemini(
  transcript: string,
): Promise<IntentAnalysis> {
  const model = getModel();
  const result = await model.generateContent([
    { text: INTENT_ANALYSIS_PROMPT },
    { text: transcript },
  ]);

  const raw = result.response.text();
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
      mode: parsed.mode,
      label: parsed.label,
      confidence: parsed.confidence,
      keywords: parsed.keywords,
      reasoning: parsed.reasoning,
    };
  } catch {
    return {
      stage: "intent",
      mode: "fullstack",
      label: "Fullstack Application",
      confidence: 0.5,
      keywords: transcript.split(" ").slice(0, 5),
      reasoning: "Fallback analysis — could not parse AI response",
    };
  }
}

// ── Requirements Extraction ────────────────────────────────────────

const REQUIREMENTS_EXTRACTION_PROMPT = `You are an expert product manager and technical lead. Based on the project description and detected intent, extract structured requirements.

Return ONLY valid JSON in this format (no markdown, no backticks):
{
  "techStack": ["Next.js", "TypeScript", "TailwindCSS"],
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "constraints": ["Must be responsive", "Must support dark mode"],
  "reasoning": "Brief technical reasoning about the architecture"
}

Be specific about technologies and features. Avoid vague statements.

Project description:`;

export async function extractRequirementsWithGemini(
  transcript: string,
  intent: IntentAnalysis,
): Promise<Requirements> {
  const model = getModel();
  const prompt = `${REQUIREMENTS_EXTRACTION_PROMPT}\n\nDetected intent: ${intent.mode} (${intent.label}, ${Math.round(intent.confidence * 100)}% confidence)\nKeywords: ${intent.keywords.join(", ")}\nReasoning: ${intent.reasoning}\n\nUser says: ${transcript}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
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
      techStack: parsed.techStack,
      features: parsed.features,
      constraints: parsed.constraints,
      reasoning: parsed.reasoning,
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

const ENHANCE_PROMPT_TEMPLATE = `You are an expert AI prompt engineer. Generate a comprehensive, production-ready markdown prompt for an AI coding assistant (Cursor, Claude, v0, Lovable, GPT).

The prompt must be detailed enough that an AI coding assistant can immediately start building the project.

## Project Context
- **Description**: {transcript}
- **Type**: {mode} ({label})
- **Keywords**: {keywords}

## Technical Requirements
- **Tech Stack**: {techStack}
- **Features**: {features}
- **Constraints**: {constraints}
- **Reasoning**: {reasoning}

## Instructions

Generate a complete markdown prompt that covers:

1. **Project Overview** — Clear one-paragraph description of what to build
2. **Tech Stack** — Specific technologies, versions, and why
3. **Architecture** — Component hierarchy, folder structure, data flow
4. **Feature Specifications** — Detailed acceptance criteria for each feature
5. **Design System** — Colors (hex), typography, spacing scale, components
6. **Responsive Design** — Breakpoints, mobile-first considerations
7. **Accessibility** — WCAG 2.1 AA compliance, semantic HTML, ARIA
8. **Implementation Order** — Step-by-step build sequence
9. **Edge Cases** — Error states, loading states, empty states
10. **Testing Strategy** — Unit, integration, E2E test scenarios

Use markdown headers, bullet points, code hints, and tables. Be technically specific and actionable.`;

export async function* enhancePromptWithGemini(
  transcript: string,
  intent: IntentAnalysis,
  requirements: Requirements,
  _mode: PromptMode,
): AsyncGenerator<string> {
  const model = getModel();

  const prompt = ENHANCE_PROMPT_TEMPLATE
    .replace("{transcript}", transcript)
    .replace("{mode}", intent.mode)
    .replace("{label}", intent.label)
    .replace("{keywords}", intent.keywords.join(", "))
    .replace("{techStack}", requirements.techStack.join(", "))
    .replace("{features}", requirements.features.join(", "))
    .replace("{constraints}", requirements.constraints.join(", "))
    .replace("{reasoning}", requirements.reasoning);

  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
