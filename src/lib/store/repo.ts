/**
 * Repository seam. The POC persists the session in the browser (Zustand persist →
 * localStorage). A Postgres/Supabase implementation can replace `browserRepo` without
 * touching the engine or the UI.
 */
import type { SessionState } from "./session";

export type SessionSnapshot = Pick<
  SessionState,
  "mode" | "weights" | "excluded" | "targetOverrides" | "responses" | "documents" | "evidence" | "notes" | "validations" | "audit"
>;

export interface SessionRepository {
  load(engagementId: string): Promise<SessionSnapshot | null>;
  save(engagementId: string, snapshot: SessionSnapshot): Promise<void>;
}

const KEY = (id: string) => `himalaya-dma-snapshot:${id}`;

export const browserRepo: SessionRepository = {
  async load(id) {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY(id));
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  },
  async save(id, snapshot) {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY(id), JSON.stringify(snapshot));
  },
};
