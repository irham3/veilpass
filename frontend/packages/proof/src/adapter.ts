import type { StoredCredential } from "../../credential/src/schema";
import type { ChallengeResponse, ProofResult, PublicInputs } from "../../shared/src/contracts";
import { proveMembership } from "./noir";

export interface ProofAdapter {
  readonly mode: "noir" | "simulated";
  prove(input: { challengeId: string; publicInputs: PublicInputs; witness: unknown }): Promise<ProofResult>;
  verify(result: ProofResult): Promise<boolean>;
}

export class NoirMembershipAdapter implements ProofAdapter {
  readonly mode = "noir" as const;
  async prove(input: { challengeId: string; publicInputs: PublicInputs; witness: unknown }): Promise<ProofResult> {
    const witness = input.witness as { challenge?: ChallengeResponse; credential?: StoredCredential };
    if (!witness.challenge || !witness.credential || witness.challenge.challengeId !== input.challengeId) throw new Error("Noir proof requires the bound challenge and local credential witness");
    const result = await proveMembership({ challenge: witness.challenge, credential: witness.credential });
    if (result.publicInputs.gateId !== input.publicInputs.gateId || result.publicInputs.origin !== input.publicInputs.origin) throw new Error("Noir proof public inputs did not match the requested gate and origin");
    return result;
  }

  async verify(): Promise<boolean> {
    // Verification is deliberately performed by the verifier endpoint using
    // the pinned VK; browsers create proofs but do not become authorities.
    return false;
  }
}
