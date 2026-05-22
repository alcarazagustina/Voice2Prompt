// ── Generate API Route ────────────────────────────────────────────
// POST /api/generate?phase=analyze|enhance
// phase=analyze: Returns intent + requirements (non-streaming)
// phase=enhance: Takes intent+requirements, streams prompt generation

import { NextRequest } from "next/server";
import {
  analyzeIntentWithGroq,
  extractRequirementsWithGroq,
  enhancePromptWithGroq,
} from "@/lib/ai/providers/groq-provider";
import type { PromptMode, IntentAnalysis, Requirements } from "@/types";

// ── Types ────────────────────────────────────────────────────────

interface AnalyzeRequest {
  transcript: string;
  mode?: PromptMode;
}

interface EnhanceRequest {
  transcript: string;
  mode: PromptMode;
  intent: IntentAnalysis;
  requirements: Requirements;
}

interface StageEvent {
  type: "stage";
  stage: string;
  data?: unknown;
  progress: number;
}

interface ChunkEvent {
  type: "chunk";
  text: string;
}

type PipelineEvent = StageEvent | ChunkEvent;

// ── Timeout wrapper ──────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// ── Route Handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Groq API key not configured. Set GROQ_API_KEY in .env.local" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const phase = searchParams.get("phase") ?? "enhance";

  if (phase === "analyze") {
    return handleAnalyze(request);
  }

  return handleEnhance(request);
}

// ── Analyze Phase ────────────────────────────────────────────────

async function handleAnalyze(request: NextRequest) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { transcript, mode: requestedMode } = body;

  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }

  try {
    const intent = await withTimeout(
      analyzeIntentWithGroq(transcript),
      10000,
      "Intent analysis",
    );

    const requirements = await withTimeout(
      extractRequirementsWithGroq(transcript, intent),
      10000,
      "Requirements extraction",
    );

    return Response.json({
      intent,
      requirements,
      mode: requestedMode || intent.mode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ── Enhance Phase ────────────────────────────────────────────────

async function handleEnhance(request: NextRequest) {
  let body: EnhanceRequest;
  try {
    body = (await request.json()) as EnhanceRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { transcript, mode, intent, requirements } = body;

  if (!transcript || !intent || !requirements) {
    return Response.json(
      { error: "transcript, intent, and requirements are required" },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {}
      };

      try {
        send({ type: "stage", stage: "enhancement", progress: 60 });

        const promptStream = enhancePromptWithGroq(transcript, intent, requirements, mode);
        const deadline = Date.now() + 30000;

        let fullPrompt = "";
        for await (const chunk of promptStream) {
          if (Date.now() > deadline) {
            throw new Error("Prompt enhancement timed out after 30s");
          }
          fullPrompt += chunk;
          send({ type: "chunk", text: chunk });
        }

        send({
          type: "stage",
          stage: "finalize",
          data: { content: fullPrompt },
          progress: 100,
        });

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ type: "stage", stage: "error", data: { message }, progress: 0 });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
