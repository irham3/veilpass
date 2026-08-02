import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

type Record = { address: string; message: string; gateId: string; expiresAtMs: number; spent: boolean };
class EnrollmentStore {
  private records = new Map<string, Record>();
  issue(address: string, gateId: string, origin: string) { const challengeId = randomUUID(); const expiresAtMs = Date.now() + 5 * 60_000; const nonce = randomBytes(32).toString("base64url"); const message = `VeilPass enrollment\norigin:${origin}\ngate:${gateId}\nnonce:${nonce}`; this.records.set(challengeId, { address, message, gateId, expiresAtMs, spent: false }); return { challengeId, message, gateId, expiresAt: new Date(expiresAtMs).toISOString() }; }
  consume(challengeId: string): Record | null { const record = this.records.get(challengeId); if (!record || record.spent || record.expiresAtMs <= Date.now()) return null; record.spent = true; return record; }
}
declare global { var veilPassEnrollmentStore: EnrollmentStore | undefined; }
export const enrollmentStore = globalThis.veilPassEnrollmentStore ?? new EnrollmentStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassEnrollmentStore = enrollmentStore;
