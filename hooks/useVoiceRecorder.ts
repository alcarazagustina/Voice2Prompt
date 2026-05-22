// ── useVoiceRecorder Hook ────────────────────────────────────────
// Web Speech API integration with full state machine (idle → recording → transcribing → done).

"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── Local Web Speech API Types ───────────────────────────────────
// (Avoids dependency on @types/web SpeechRecognition types)

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionError {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface SpeechGrammarListInstance {
  // Not used directly, just checking for existence
  length: number;
}

// ── Types ────────────────────────────────────────────────────────

export type VoiceRecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "transcribing"
  | "transcriptReady"
  | "error";

export type VoiceRecorderErrorCode =
  | "not-supported"
  | "permission-denied"
  | "no-microphone"
  | "recognition-failed"
  | "empty-transcript";

export interface VoiceRecorderError {
  code: VoiceRecorderErrorCode;
  message: string;
}

export interface UseVoiceRecorderReturn {
  /** Current state in the recorder state machine */
  state: VoiceRecorderState;
  /** The final transcript text */
  transcript: string;
  /** Interim transcript (while still recording) */
  interimTranscript: string;
  /** Whether the browser supports Web Speech API */
  isSupported: boolean;
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Error info when state is "error" */
  error: VoiceRecorderError | null;
  /** Request microphone and start recording */
  startRecording: () => void;
  /** Stop recording and begin transcription */
  stopRecording: () => void;
  /** Reset back to idle */
  reset: () => void;
}

// ── Browser Support Detection ────────────────────────────────────

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;

  const win = window as unknown as Record<string, unknown>;
  return (
    (win.SpeechRecognition as SpeechRecognitionConstructor) ??
    (win.webkitSpeechRecognition as SpeechRecognitionConstructor) ??
    null
  );
}

function detectBrowserSupport(): boolean {
  const SpeechRecognition = getSpeechRecognitionCtor();
  if (!SpeechRecognition) return false;

  const win = window as unknown as Record<string, unknown>;
  const SpeechGrammarList =
    (win.SpeechGrammarList as SpeechGrammarListInstance) ??
    (win.webkitSpeechGrammarList as SpeechGrammarListInstance);

  return !!SpeechGrammarList;
}

// ── Hook ─────────────────────────────────────────────────────────

const INITIAL_TRANSCRIPT = "";
const INITIAL_INTERIM = "";

export function useVoiceRecorder(
  options?: {
    /** Language for speech recognition (defaults to browser language) */
    language?: string;
  },
): UseVoiceRecorderReturn {
  const languageOption = options?.language;

  const [language, setLanguage] = useState(languageOption ?? "en-US");

  const [state, setState] = useState<VoiceRecorderState>("idle");
  const [transcript, setTranscript] = useState(INITIAL_TRANSCRIPT);
  const [interimTranscript, setInterimTranscript] =
    useState(INITIAL_INTERIM);
  const [error, setError] = useState<VoiceRecorderError | null>(null);
  const [isSupported, setIsSupported] = useState(true); // optimistic default for SSR consistency

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isSupportedRef = useRef(true); // optimistic default, synced with state
  const stateRef = useRef(state);

  // Detect real browser support after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const supported = detectBrowserSupport();
    isSupportedRef.current = supported;
    setIsSupported(supported);
  }, []);

  // Detect browser language on mount (avoids SSR hydration mismatch)
  const languageRef = useRef(languageOption ?? "en-US");
  useEffect(() => {
    if (!languageOption) {
      const detected =
        typeof navigator !== "undefined"
          ? navigator.language || "en-US"
          : "en-US";
      languageRef.current = detected;
      setLanguage(detected);
    }
  }, [languageOption]);

  // Keep state ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore cleanup errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!isSupportedRef.current) {
      setError({
        code: "not-supported",
        message:
          "Speech recognition is not supported in this browser. Use the text input instead.",
      });
      setState("error");
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setError({
        code: "not-supported",
        message: "Speech recognition API not available.",
      });
      setState("error");
      return;
    }

    setState("requesting");
    setError(null);
    setTranscript(INITIAL_TRANSCRIPT);
    setInterimTranscript(INITIAL_INTERIM);

    const recognition = new SpeechRecognitionCtor();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageRef.current;
    recognition.maxAlternatives = 1;

    // Event handlers
    recognition.onstart = () => {
      setState("recording");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript((prev) => prev + finalTranscript);
      }
      if (interim) {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      const errorCode = event.error;

      if (
        errorCode === "not-allowed" ||
        errorCode === "permission-denied"
      ) {
        setError({
          code: "permission-denied",
          message:
            "Microphone access denied. Grant permission or use the text input.",
        });
      } else if (errorCode === "no-speech") {
        setError({
          code: "empty-transcript",
          message:
            "No speech detected. Try speaking louder or use the text input.",
        });
      } else if (
        errorCode === "audio-capture" ||
        errorCode === "no-microphone"
      ) {
        setError({
          code: "no-microphone",
          message:
            "No microphone detected. Connect a microphone or use the text input.",
        });
      } else {
        setError({
          code: "recognition-failed",
          message: `Speech recognition error: ${errorCode}`,
        });
      }

      setState("error");
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      if (stateRef.current !== "error") {
        setState("transcribing");
        setTimeout(() => {
          setState("transcriptReady");
        }, 300);
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError({
        code: "recognition-failed",
        message:
          err instanceof Error
            ? err.message
            : "Failed to start speech recognition",
      });
      setState("error");
      recognitionRef.current = null;
    }
  }, [languageOption]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors
      }
      recognitionRef.current = null;
    }

    setState((prev) => {
      if (prev === "recording" || prev === "requesting") {
        return "transcriptReady";
      }
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore abort errors
      }
      recognitionRef.current = null;
    }
    setState("idle");
    setTranscript(INITIAL_TRANSCRIPT);
    setInterimTranscript(INITIAL_INTERIM);
    setError(null);
  }, []);

  return {
    state,
    transcript,
    interimTranscript,
    isSupported,
    isRecording: state === "recording",
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
