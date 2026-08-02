/// <reference lib="webworker" />

import { proofResultSchema } from "../../shared/src/contracts";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent) => {
  const parsed = proofResultSchema.safeParse(event.data);
  if (!parsed.success) { self.postMessage({ ok: false, error: "PROOF_INVALID" }); return; }
  self.postMessage({ ok: false, error: "SERVICE_UNAVAILABLE", message: "Noir artifact is not built in this environment" });
};

export {};
