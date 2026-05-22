// ── Mock AI Provider ─────────────────────────────────────────────
// Keyword-aware, mode-specific mock that simulates realistic AI pipeline output.
// Uses regex heuristics for intent classification and templates for prompt generation.

import type {
  PromptMode,
  IntentAnalysis,
  Requirements,
} from "@/types";
import type { AIProvider } from "./base";
import { getPromptTemplate } from "@/lib/ai/prompts/system-prompts";

// ── Keyword Maps ─────────────────────────────────────────────────

const keywordMaps: Record<PromptMode, RegExp[]> = {
  frontend: [
    /landing\s*page/i,
    /component/i,
    /ui|user\s*interface/i,
    /form/i,
    /button/i,
    /modal/i,
    /sidebar/i,
    /navbar|header/i,
    /card/i,
    /layout/i,
    /responsive/i,
    /frontend/i,
    /react/i,
    /tailwind/i,
    /animation/i,
    /mobile\s*(first|friendly)/i,
  ],
  saas: [
    /saas/i,
    /pricing/i,
    /subscription/i,
    /auth|authentication/i,
    /login|sign.?in/i,
    /dashboard/i,
    /analytics/i,
    /billing/i,
    /user\s*management/i,
    /role|permission/i,
    /onboarding/i,
    /churn|retention/i,
    /saas|b2b/i,
  ],
  automation: [
    /automation/i,
    /workflow/i,
    /cron/i,
    /schedule/i,
    /pipeline/i,
    /ci\s*\/?\s*cd/i,
    /deploy/i,
    /job|task/i,
    /trigger|event/i,
    /notification/i,
    /batch/i,
    /processing/i,
    /automation/i,
  ],
  design: [
    /design/i,
    /token/i,
    /theme/i,
    /color|colour/i,
    /typography|font/i,
    /spacing/i,
    /layout\s*system/i,
    /component\s*library/i,
    /style\s*guide|pattern\s*library/i,
    /dark\s*mode/i,
    /brand/i,
    /design\s*system/i,
    /atomic/i,
  ],
  fullstack: [
    /full.?stack/i,
    /api|endpoint/i,
    /database|db/i,
    /auth|authentication/i,
    /backend/i,
    /server/i,
    /crud/i,
    /rest|graphql/i,
    /full.?stack/i,
    /end.?to.?end/i,
    /complete\s*app/i,
    /web\s*app/i,
  ],
};

// ── Tech Stack Keywords ──────────────────────────────────────────

const techStackKeywords: Record<string, string[]> = {
  react: ["react", "jsx", "tsx", "component", "hook", "state", "props"],
  nextjs: ["next", "nextjs", "app router", "ssr", "static"],
  tailwind: ["tailwind", "css", "utility", "responsive"],
  typescript: ["typescript", "type", "interface", "generic", "strict"],
  node: ["node", "nodejs", "express", "server", "api"],
  database: ["database", "db", "sql", "postgres", "mongodb", "indexeddb"],
  auth: ["auth", "login", "signup", "oauth", "jwt", "session"],
  api: ["api", "rest", "graphql", "endpoint", "route"],
  animation: ["animation", "framer", "motion", "transition", "animate"],
  testing: ["test", "jest", "vitest", "cypress", "playwright"],
};

// ── Productive Keywords (for confidence) ─────────────────────────

const productiveKeywords = [
  "build",
  "create",
  "make",
  "add",
  "implement",
  "design",
  "develop",
  "generate",
  "show",
  "display",
  "render",
  "handle",
  "manage",
  "integrate",
];

// ── Helpers ──────────────────────────────────────────────────────

function detectKeywords(text: string, patterns: RegExp[]): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      found.add(match[0].toLowerCase());
    }
  }
  return Array.from(found);
}

function detectTechStack(text: string): string[] {
  const stack: string[] = [];
  for (const [tech, keywords] of Object.entries(techStackKeywords)) {
    for (const kw of keywords) {
      if (text.toLowerCase().includes(kw)) {
        stack.push(tech);
        break;
      }
    }
  }
  return stack.length > 0 ? stack : ["react", "typescript", "tailwind"];
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  // Look for bullet or numbered lists in the transcript
  const listItems = text.match(/[•\-*\d+.]\s*([A-Za-z][^.\n]{5,80})/g);
  if (listItems) {
    for (const item of listItems) {
      const clean = item.replace(/^[•\-*\d+.]\s*/, "").trim();
      if (clean.length > 5) features.push(clean);
    }
  }

  // Also look for sentences that describe functionality
  if (features.length === 0) {
    const sentences = text.match(
      /[A-Z][^.!?]*(?:build|create|add|show|display|handle|manage|integrate)[^.!?]*[.!?]/gi,
    );
    if (sentences) {
      for (const s of sentences) {
        features.push(s.trim().replace(/\.$/, ""));
      }
    }
  }

  return features.length > 0
    ? features
    : ["General feature implementation"];
}

function extractConstraints(mode: PromptMode): string[] {
  const base = [
    "TypeScript strict mode",
    "Responsive design (mobile-first)",
    "Accessible (WCAG 2.1 AA)",
  ];
  const modeConstraints: Record<PromptMode, string[]> = {
    frontend: ["No server dependencies", "Client-side rendering only"],
    saas: ["Optimistic UI updates", "Error boundaries for each section"],
    automation: ["Cancelable mid-execution", "Step timeout at 30s"],
    design: [
      "Supports light and dark mode",
      "Consistent with Zinc design tokens",
    ],
    fullstack: [
      "End-to-end type safety",
      "Offline-resilient data layer",
    ],
  };
  return [...base, ...(modeConstraints[mode] ?? [])];
}

function computeConfidence(
  text: string,
  matchCount: number,
  totalPatterns: number,
): number {
  const hasProductiveWords = productiveKeywords.some((w) =>
    text.toLowerCase().includes(w),
  );
  const lengthBonus = Math.min(text.length / 200, 1);
  const matchRatio = matchCount / Math.max(totalPatterns, 1);
  const base = matchRatio * 0.6 + lengthBonus * 0.2;
  const productiveBonus = hasProductiveWords ? 0.2 : 0;
  return Math.min(Math.round((base + productiveBonus) * 100) / 100, 0.99);
}

// ── MockProvider ─────────────────────────────────────────────────

export class MockProvider implements AIProvider {
  private _cancelled = false;

  cancel(): void {
    this._cancelled = true;
  }

  async analyzeIntent(
    transcript: string,
    mode: PromptMode,
  ): Promise<IntentAnalysis> {
    await sleep(300);

    const clean = transcript.trim();
    if (!clean) {
      return {
        stage: "intent",
        mode,
        label: "Empty transcript",
        confidence: 0,
        keywords: [],
        reasoning: "No input provided to analyze.",
      };
    }

    // Score each mode
    const scores: Array<{ mode: PromptMode; count: number }> = [];
    for (const [m, patterns] of Object.entries(keywordMaps)) {
      const count = patterns.filter((p) => p.test(clean)).length;
      scores.push({ mode: m as PromptMode, count });
    }
    scores.sort((a, b) => b.count - a.count);

    const best = scores[0];
    const matchedMode = best.count > 0 ? best.mode : mode;
    const bestPatterns = keywordMaps[matchedMode];
    const keywords = detectKeywords(clean, bestPatterns);

    const confidence = computeConfidence(
      clean,
      best.count,
      bestPatterns.length,
    );

    const label = generateLabel(matchedMode, keywords);

    return {
      stage: "intent",
      mode: matchedMode,
      label,
      confidence,
      keywords,
      reasoning:
        `Detected ${keywords.length} relevant keyword(s) in transcript. ` +
        `Best mode match: ${matchedMode} (${best.count}/${bestPatterns.length} patterns matched).` +
        (confidence > 0.6
          ? " Strong signal."
          : confidence > 0.3
            ? " Moderate signal."
            : " Weak signal — using default mode."),
    };
  }

  async extractRequirements(
    transcript: string,
    intent: IntentAnalysis,
  ): Promise<Requirements> {
    await sleep(400);

    const clean = transcript.trim();
    const techStack = detectTechStack(clean);
    const features = extractFeatures(clean);
    const constraints = extractConstraints(intent.mode);

    return {
      stage: "requirements",
      techStack: Array.from(new Set(techStack)),
      features,
      constraints,
      reasoning:
        `Extracted ${techStack.length} tech stack items, ${features.length} features, ` +
        `and ${constraints.length} constraints from the transcript. Mode: ${intent.mode}.`,
    };
  }

  async *enhancePrompt(
    transcript: string,
    intent: IntentAnalysis,
    requirements: Requirements,
    mode: PromptMode,
  ): AsyncGenerator<string> {
    this._cancelled = false;

    // Build the full prompt from the template
    const templateFn = getPromptTemplate(mode);
    const fullPrompt = templateFn(intent, requirements);

    // Add the user's transcript as the specific task description
    const promptWithTask =
      `${fullPrompt}\n\n## Task Description\nBuild the following based on the user's request:\n\n${transcript.trim()}\n`;

    // Simulate streaming: yield chunks of the prompt
    const chunkSize = randomInt(10, 20);
    let position = 0;

    while (position < promptWithTask.length) {
      if (this._cancelled) break;

      const end = Math.min(position + chunkSize, promptWithTask.length);
      const chunk = promptWithTask.slice(position, end);
      yield chunk;

      position = end;

      // Simulate realistic delay between chunks
      await sleep(randomInt(50, 100));
    }
  }
}

// ── Standalone Helpers ───────────────────────────────────────────

function generateLabel(mode: PromptMode, _keywords: string[]): string {
  const labels: Record<PromptMode, string[]> = {
    frontend: [
      "Frontend UI Component",
      "Interface Design",
      "User Interface Feature",
      "Component Implementation",
      "Layout & Responsive Design",
    ],
    saas: [
      "SaaS Feature Development",
      "Business Application Logic",
      "Subscription & Auth Flow",
      "Dashboard & Analytics",
      "User Management System",
    ],
    automation: [
      "Automation Workflow",
      "Background Task Pipeline",
      "Scheduled Job System",
      "Event-Driven Processing",
      "CI/CD Integration",
    ],
    design: [
      "Design System Component",
      "Visual Pattern Library",
      "Theme & Token Architecture",
      "Component Style Guide",
      "UI Pattern Specification",
    ],
    fullstack: [
      "Full-Stack Feature",
      "End-to-End Implementation",
      "Complete Application Module",
      "Full-Stack Data Flow",
      "Complete Stack Solution",
    ],
  };

  const options = labels[mode] ?? labels.frontend;
  return options[randomInt(0, options.length - 1)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
