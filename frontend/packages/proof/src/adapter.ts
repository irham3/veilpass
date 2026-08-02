import type { ProofResult, PublicInputs } from "../../shared/src/contracts";

export interface ProofAdapter {
  readonly mode: "noir" | "simulated";
  prove(input: { challengeId: string; publicInputs: PublicInputs; witness: unknown }): Promise<ProofResult>;
  verify(result: ProofResult): Promise<boolean>;
}

export class UnavailableNoirAdapter implements ProofAdapter {
  readonly mode = "noir" as const;
  async prove(): Promise<never> { throw new Error("Noir artifact is not built. Install the pinned WSL toolchain and compile the circuit."); }
  async verify(): Promise<boolean> { return false; }
}
