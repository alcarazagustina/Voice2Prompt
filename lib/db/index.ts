export type { DBConfig, DBResult, StoreName, Session, NewSession } from "./types";
export { DEFAULT_DB_CONFIG, STORES } from "./types";
export {
  initDB,
  closeDB,
  saveSession,
  getSession,
  getAllSessions,
  deleteSession,
  clearAllSessions,
  updateSession,
  getSessionCount,
} from "./indexeddb";
export type { DBSession } from "./indexeddb";
