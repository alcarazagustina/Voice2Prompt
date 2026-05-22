// ── Database-Specific Types ──────────────────────────────────────
// Extends the shared Session type with DB-specific metadata.

import type { Session, NewSession } from "@/types";

/** Database configuration */
export interface DBConfig {
  name: string;
  version: number;
  /** Maximum number of sessions before LRU eviction */
  maxSessions: number;
}

export const DEFAULT_DB_CONFIG: DBConfig = {
  name: "voice2prompt",
  version: 1,
  maxSessions: 100,
};

/** Result of a DB operation */
export interface DBResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

/** IndexedDB store names */
export const STORES = {
  SESSIONS: "sessions",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

/** Re-export for convenience */
export type { Session, NewSession };
