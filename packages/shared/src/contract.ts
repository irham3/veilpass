import { Contract, Networks, TransactionBuilder, nativeToScVal, rpc, scValToNative } from "@stellar/stellar-sdk";

export type GateState = { owner: string; policy_hash: Uint8Array; credential_root: Uint8Array; epoch: number; updated_at: bigint };

export async function readGateState({ contractId, gateId, rpcUrl = "https://soroban-testnet.stellar.org", sourceAccount }: { contractId: string; gateId: string; rpcUrl?: string; sourceAccount: string }): Promise<GateState> {
  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://localhost") });
  const account = await server.getAccount(sourceAccount);
  const transaction = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET }).addOperation(new Contract(contractId).call("get_gate", nativeToScVal(gateId))).setTimeout(30).build();
  const simulated = await server.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simulated) || !simulated.result?.retval) throw new Error("Gate state simulation failed");
  return scValToNative(simulated.result.retval) as GateState;
}
