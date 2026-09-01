import type { VeilPassErrorCode } from "@veilpass/shared";

export type ChallengeConsumeInput = {
  challengeId: string;
  challengeHash: string;
  gateId: string;
  origin: string;
  loginNullifier: string;
};

export type ChallengeConsumeResult =
  | { ok: true }
  | { ok: false; error: VeilPassErrorCode };

/**
 * Host-owned persistence boundary. The implementation must consume the
 * challenge and nullifier atomically to prevent concurrent replay.
 */
export interface ChallengeStore {
  consume(input: ChallengeConsumeInput): Promise<ChallengeConsumeResult>;
}
