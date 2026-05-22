// ── IndexedDB — Schema & CRUD ────────────────────────────────────
// Uses the `idb` library (openDB) for a typed, promise-based IndexedDB wrapper.
// Schema: sessions store with LRU eviction at 100 items.

import { openDB, type IDBPDatabase } from "idb";
import type { Session, NewSession } from "./types";
import { DEFAULT_DB_CONFIG, STORES } from "./types";

// ── Types ────────────────────────────────────────────────────────

interface Voice2PromptDB extends IDBPDatabase<unknown> {
  // Typed shape for the sessions store
}

type DBSession = Session & { id: number };

// ── Singleton DB Instance ────────────────────────────────────────

let dbInstance: Voice2PromptDB | null = null;
let initPromise: Promise<Voice2PromptDB> | null = null;
const config = DEFAULT_DB_CONFIG;

// ── Initialization ───────────────────────────────────────────────

/**
 * Open (or reuse) the IndexedDB connection.
 * Uses a singleton pattern so we don't open multiple connections.
 */
export async function initDB(): Promise<Voice2PromptDB> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = openDB(config.name, config.version, {
    upgrade(db) {
      // Sessions store
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const store = db.createObjectStore(STORES.SESSIONS, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    },
  }).then((db) => {
    dbInstance = db as unknown as Voice2PromptDB;
    return dbInstance;
  }).catch((err) => {
    initPromise = null; // Reset so next call retries
    throw err;
  });

  return initPromise;
}

/**
 * Close the DB connection and reset the singleton.
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    initPromise = null;
  }
}

// ── CRUD Operations ──────────────────────────────────────────────

/**
 * Save a new session to IndexedDB.
 * Handles LRU eviction: if the store exceeds `maxSessions`,
 * the oldest entries are deleted.
 *
 * Returns the saved session with its assigned ID, or null on failure.
 */
export async function saveSession(
  session: NewSession,
): Promise<DBSession | null> {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.SESSIONS, "readwrite");
    const store = tx.objectStore(STORES.SESSIONS);

    // Enforce LRU eviction before inserting
    await enforceLRU(store, config.maxSessions);

    const id = await store.add({
      ...session,
      createdAt: session.createdAt instanceof Date
        ? session.createdAt
        : new Date(session.createdAt),
      updatedAt: new Date(),
    });

    await tx.done;

    return { ...session, id: id as number };
  } catch {
    return null;
  }
}

/**
 * Retrieve a session by its ID.
 * Returns null if not found or on error.
 */
export async function getSession(
  id: number,
): Promise<DBSession | null> {
  try {
    const db = await initDB();
    const result = await db.get(STORES.SESSIONS, id);
    return (result as DBSession) ?? null;
  } catch {
    return null;
  }
}

/**
 * Retrieve all sessions, ordered by createdAt descending (newest first).
 * Returns an empty array on error or if no sessions exist.
 */
export async function getAllSessions(): Promise<DBSession[]> {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.SESSIONS, "readonly");
    const store = tx.objectStore(STORES.SESSIONS);
    const index = store.index("createdAt");

    // Get all entries in reverse chronological order
    const sessions = await index.getAll();
    sessions.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return sessions as DBSession[];
  } catch {
    return [];
  }
}

/**
 * Delete a session by its ID.
 * Returns true if deleted, false if not found or on error.
 */
export async function deleteSession(id: number): Promise<boolean> {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.SESSIONS, "readwrite");
    const store = tx.objectStore(STORES.SESSIONS);

    const existing = await store.get(id);
    if (!existing) {
      await tx.done;
      return false;
    }

    await store.delete(id);
    await tx.done;
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete ALL sessions from the store.
 * Returns true on success, false on error.
 */
export async function clearAllSessions(): Promise<boolean> {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.SESSIONS, "readwrite");
    const store = tx.objectStore(STORES.SESSIONS);
    await store.clear();
    await tx.done;
    return true;
  } catch {
    return false;
  }
}

/**
 * Update an existing session.
 * Returns the updated session or null on error.
 */
export async function updateSession(
  id: number,
  updates: Partial<Omit<NewSession, "createdAt">>,
): Promise<DBSession | null> {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.SESSIONS, "readwrite");
    const store = tx.objectStore(STORES.SESSIONS);

    const existing = await store.get(id);
    if (!existing) {
      await tx.done;
      return null;
    }

    const updated: Session = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    await store.put(updated);
    await tx.done;
    return updated as DBSession;
  } catch {
    return null;
  }
}

/**
 * Get the total count of sessions in the store.
 */
export async function getSessionCount(): Promise<number> {
  try {
    const db = await initDB();
    const tx = db.transaction(STORES.SESSIONS, "readonly");
    const store = tx.objectStore(STORES.SESSIONS);
    const count = await store.count();
    return count;
  } catch {
    return 0;
  }
}

// ── LRU Eviction ─────────────────────────────────────────────────

/**
 * Enforce the maximum session count by deleting the oldest entries.
 * Runs inside a transaction (caller must provide the store).
 */
async function enforceLRU(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store: any,
  max: number,
): Promise<void> {
  try {
    const index = store.index("createdAt");
    const count = await store.count();

    if (count < max) return;

    // Get all entries sorted by createdAt ascending (oldest first)
    const allEntries = await index.getAll();
    allEntries.sort(
      (a: Session, b: Session) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    // Calculate how many to delete
    const toDelete = count - max + 1; // +1 to make room for the new entry
    for (let i = 0; i < toDelete && i < allEntries.length; i++) {
      const entry = allEntries[i];
      if (entry.id !== undefined) {
        await store.delete(entry.id);
      }
    }
  } catch {
    // Fail silently — LRU eviction is best-effort
  }
}

// ── Count Sessions (internal) ────────────────────────────────────

// Re-export type
export type { DBSession };
