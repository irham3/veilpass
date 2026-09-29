import "server-only";

import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

type Session = { privateAppId: string; gateId: string; expiresAtMs: number };

class SessionStore {
  private sessions = new Map<string, Session>();
  async create(session: Session): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const digest = hash(token);
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false });
      await sql`insert into veilpass.demo_sessions (token_digest, private_app_id, gate_id, expires_at) values (${digest}, ${session.privateAppId}, ${session.gateId}, ${new Date(session.expiresAtMs)})`;
      await sql.end();
    } else { this.sessions.set(digest, session); }
    return token;
  }
  async read(token: string): Promise<Session | null> {
    const digest = hash(token);
    if (process.env.DATABASE_URL) {
      const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false });
      const rows = await sql<{ private_app_id: string; gate_id: string; expires_at: Date }[]>`select private_app_id, gate_id, expires_at from veilpass.demo_sessions where token_digest = ${digest} and expires_at > now()`;
      await sql.end();
      const row = rows[0]; return row ? { privateAppId: row.private_app_id, gateId: row.gate_id, expiresAtMs: row.expires_at.getTime() } : null;
    }
    const value = this.sessions.get(digest);
    if (!value || value.expiresAtMs <= Date.now()) return null;
    return value;
  }
}

function hash(token: string): string { return createHash("sha256").update(token).digest("hex"); }
declare global { var veilPassSessionStore: SessionStore | undefined; }
export const sessionStore = globalThis.veilPassSessionStore ?? new SessionStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassSessionStore = sessionStore;
