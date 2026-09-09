/// <reference lib="webworker" />

import type { StoredCredential } from "../../credential/src/schema";
import type { ChallengeResponse } from "../../shared/src/contracts";
import { proveMembership } from "./noir";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<{ id?: string; challenge?: ChallengeResponse; credential?: StoredCredential }>) => {
  void (async () => {
    const { id, challenge, credential } = event.data;
    if (!id || !challenge || !credential) { self.postMessage({ id, ok: false, error: "PROOF_INVALID" }); return; }
    try {
      const proof = await proveMembership({ challenge, credential });
      self.postMessage({ id, ok: true, proof });
    } catch (error) {
      self.postMessage({ id, ok: false, error: "PROOF_INVALID", message: error instanceof Error ? error.message : "Local proof generation failed" });
    }
  })();
};

export {};
