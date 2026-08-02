import { proofResultSchema, type ProofResult } from "../../shared/src/contracts";

type Envelope = { type: "veilpass:proof"; state: string; payload: ProofResult };

export function validatePopupMessage({ event, popup, loginOrigin, state }: { event: MessageEvent; popup: Window; loginOrigin: string; state: string }): ProofResult | null {
  if (event.origin !== loginOrigin || event.source !== popup) return null;
  const value = event.data as Partial<Envelope> | null;
  if (!value || value.type !== "veilpass:proof" || value.state !== state) return null;
  const parsed = proofResultSchema.safeParse(value.payload);
  return parsed.success ? parsed.data : null;
}
