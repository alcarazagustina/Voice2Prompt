// ── useIndexedDB Hook ────────────────────────────────────────────
// React hook wrapping the IndexedDB CRUD layer with initialization state management.

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type { Session, NewSession } from "@/types";
import {
  initDB,
  saveSession as dbSaveSession,
  getSession as dbGetSession,
  getAllSessions as dbGetAllSessions,
  deleteSession as dbDeleteSession,
  clearAllSessions as dbClearAllSessions,
  closeDB,
} from "@/lib/db/indexeddb";

// ── Types ────────────────────────────────────────────────────────

type DBStatus = "loading" | "ready" | "error";

interface UseIndexedDBReturn {
  /** Current initialization status */
  status: DBStatus;
  /** True when the DB is ready to use */
  isReady: boolean;
  /** Error message if initialization failed */
  error: string | null;
  /** Save a new session */
  saveSession: (session: NewSession) => Promise<Session | null>;
  /** Retrieve a session by ID */
  getSession: (id: number) => Promise<Session | null>;
  /** Get all sessions (newest first) */
  getAllSessions: () => Promise<Session[]>;
  /** Delete a single session */
  deleteSession: (id: number) => Promise<boolean>;
  /** Delete all sessions */
  clearAllSessions: () => Promise<boolean>;
}

// ── Hook ─────────────────────────────────────────────────────────

export function useIndexedDB(): UseIndexedDBReturn {
  const [status, setStatus] = useState<DBStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const initStarted = useRef(false);

  useEffect(() => {
    // Prevent double init in Strict Mode
    if (initStarted.current) return;
    initStarted.current = true;

    let mounted = true;

    initDB()
      .then(() => {
        if (mounted) {
          setStatus("ready");
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setStatus("error");
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize database",
          );
        }
      });

    return () => {
      mounted = false;
      // Cleanup: close DB connection
      closeDB();
    };
  }, []);

  const saveSession = useCallback(
    async (session: NewSession): Promise<Session | null> => {
      return dbSaveSession(session);
    },
    [],
  );

  const getSession = useCallback(
    async (id: number): Promise<Session | null> => {
      return dbGetSession(id);
    },
    [],
  );

  const getAllSessions = useCallback(async (): Promise<Session[]> => {
    return dbGetAllSessions();
  }, []);

  const deleteSession = useCallback(
    async (id: number): Promise<boolean> => {
      return dbDeleteSession(id);
    },
    [],
  );

  const clearAllSessions = useCallback(async (): Promise<boolean> => {
    return dbClearAllSessions();
  }, []);

  return {
    status,
    isReady: status === "ready",
    error,
    saveSession,
    getSession,
    getAllSessions,
    deleteSession,
    clearAllSessions,
  };
}
