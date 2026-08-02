import "server-only";

import { createHash, randomBytes } from "node:crypto";

type Session = { privateAppId: string; gateId: string; expiresAtMs: number };

class SessionStore {
  private sessions = new Map<string, Session>();
  create(session: Session): string {
    const token = randomBytes(32).toString("base64url");
    this.sessions.set(hash(token), session);
    return token;
  }
  read(token: string): Session | null {
    const value = this.sessions.get(hash(token));
    if (!value || value.expiresAtMs <= Date.now()) return null;
    return value;
  }
}

function hash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
declare global { var veilPassSessionStore: SessionStore | undefined; }
export const sessionStore = globalThis.veilPassSessionStore ?? new SessionStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassSessionStore = sessionStore;
