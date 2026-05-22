// ── useStreamingUI Hook ──────────────────────────────────────────
// Consumes tokens from a generator or text and renders them
// character-by-character with a configurable typewriter speed.

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────

export interface StreamingOptions {
  /** Characters revealed per tick (default: 1) */
  charsPerTick?: number;
  /** Milliseconds per tick (default: 30) */
  tickInterval?: number;
}

export interface UseStreamingUIReturn {
  /** The text displayed so far, growing over time */
  displayedText: string;
  /** Whether all text has been displayed */
  isComplete: boolean;
  /** Reset the stream back to empty */
  reset: () => void;
  /** Skip to the end — reveal all text immediately */
  skipToEnd: () => void;
  /** Progress as a percentage 0–100 */
  progress: number;
}

// ── Hook: from text string ───────────────────────────────────────

export function useStreamingUI(
  text: string,
  options?: StreamingOptions,
): UseStreamingUIReturn {
  const { charsPerTick = 1, tickInterval = 30 } = options ?? {};

  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when text changes
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);

    if (!text) {
      setIsComplete(true);
      return;
    }

    // Start streaming
    timerRef.current = setInterval(() => {
      const nextIndex = indexRef.current + charsPerTick;

      if (nextIndex >= text.length) {
        setDisplayedText(text);
        setIsComplete(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setDisplayedText(text.slice(0, nextIndex));
        indexRef.current = nextIndex;
      }
    }, tickInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, charsPerTick, tickInterval]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);
  }, []);

  const skipToEnd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplayedText(text);
    setIsComplete(true);
    indexRef.current = text.length;
  }, [text]);

  const progress = text
    ? Math.round((indexRef.current / text.length) * 100)
    : 100;

  return {
    displayedText,
    isComplete,
    reset,
    skipToEnd,
    progress,
  };
}

// ── Hook: from token generator ───────────────────────────────────

export function useStreamingUITokens(
  tokens: string[],
  options?: StreamingOptions,
): UseStreamingUIReturn {
  const { charsPerTick = 1, tickInterval = 30 } = options ?? {};

  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute the full text from tokens
  const fullText = tokens.join("");

  // Reset and re-stream when tokens change
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);

    if (!fullText) {
      setIsComplete(true);
      return;
    }

    // Append newly added tokens immediately, then continue streaming
    timerRef.current = setInterval(() => {
      const nextIndex = indexRef.current + charsPerTick;

      if (nextIndex >= fullText.length) {
        setDisplayedText(fullText);
        setIsComplete(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } else {
        setDisplayedText(fullText.slice(0, nextIndex));
        indexRef.current = nextIndex;
      }
    }, tickInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fullText, charsPerTick, tickInterval]);

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);
  }, []);

  const skipToEnd = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplayedText(fullText);
    setIsComplete(true);
    indexRef.current = fullText.length;
  }, [fullText]);

  const progress = fullText
    ? Math.round((indexRef.current / fullText.length) * 100)
    : 100;

  return {
    displayedText,
    isComplete,
    reset,
    skipToEnd,
    progress,
  };
}
