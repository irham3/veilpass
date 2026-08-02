import { nativeToScVal, xdr } from "@stellar/stellar-sdk";

export type GateState = { owner: string; policy_hash: Uint8Array; credential_root: Uint8Array; epoch: number; updated_at: bigint };

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const CONTRACT_VERSION_BYTE = 2 << 3;
const ED25519_PUBLIC_KEY_VERSION_BYTE = 6 << 3;

function decodeBase32(value: string): Uint8Array {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const char of value.replace(/=+$/u, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Invalid StrKey character");
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(output);
}

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let buffer = 0;
  let output = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

function crc16Xmodem(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function decodeStrKeyPayload(value: string, versionByte: number, label: string): Uint8Array {
  const decoded = decodeBase32(value);
  if (decoded.length !== 35 || decoded[0] !== versionByte) throw new Error(`Invalid ${label} StrKey`);
  const checksumPayload = decoded.slice(0, -2);
  const actual = decoded[decoded.length - 2] | (decoded[decoded.length - 1] << 8);
  if (crc16Xmodem(checksumPayload) !== actual) throw new Error(`Invalid ${label} StrKey checksum`);
  return decoded.slice(1, 33);
}

export function decodeContractId(contractId: string): Uint8Array {
  return decodeStrKeyPayload(contractId, CONTRACT_VERSION_BYTE, "contract");
}

export function decodeEd25519PublicKey(publicKey: string): Uint8Array {
  return decodeStrKeyPayload(publicKey, ED25519_PUBLIC_KEY_VERSION_BYTE, "account");
}

export function encodeEd25519PublicKey(publicKey: Uint8Array): string {
  if (publicKey.length !== 32) throw new Error("Invalid ed25519 public key payload");
  const payload = new Uint8Array(35);
  payload[0] = ED25519_PUBLIC_KEY_VERSION_BYTE;
  payload.set(publicKey, 1);
  const checksum = crc16Xmodem(payload.slice(0, -2));
  payload[33] = checksum & 0xff;
  payload[34] = checksum >> 8;
  return encodeBase32(payload);
}

function buildInvokeContractOperation(contractId: string, functionName: string, args: xdr.ScVal[]) {
  const hostFunction = xdr.HostFunction.hostFunctionTypeInvokeContract(
      new xdr.InvokeContractArgs({
        contractAddress: xdr.ScAddress.scAddressTypeContract(Buffer.from(decodeContractId(contractId)) as unknown as xdr.Hash),
        functionName,
        args,
      }),
  );
  return new xdr.Operation({
    sourceAccount: null,
    body: xdr.OperationBody.invokeHostFunction(new xdr.InvokeHostFunctionOp({ hostFunction, auth: [] })),
  });
}

function buildReadOnlyTransactionXdr({ contractId, functionName, args, sourceAccount }: { contractId: string; functionName: string; args: xdr.ScVal[]; sourceAccount: string }) {
  const transaction = new xdr.Transaction({
    sourceAccount: xdr.MuxedAccount.keyTypeEd25519(Buffer.from(decodeEd25519PublicKey(sourceAccount))),
    fee: 100,
    seqNum: xdr.Int64.fromString("0"),
    cond: xdr.Preconditions.precondNone(),
    memo: xdr.Memo.memoNone(),
    operations: [buildInvokeContractOperation(contractId, functionName, args)],
    ext: new xdr.TransactionExt(0),
  });
  return xdr.TransactionEnvelope.envelopeTypeTx(new xdr.TransactionV1Envelope({ tx: transaction, signatures: [] })).toXDR("base64").toString();
}

function parseGateState(value: xdr.ScVal): GateState {
  if (value.switch().name !== "scvMap" || !value.map()) throw new Error("Gate state return value is not a map");
  const entries = new Map(value.map()?.map((entry) => [entry.key().sym().toString(), entry.val()]));
  const credentialRoot = entries.get("credential_root");
  const epoch = entries.get("epoch");
  const owner = entries.get("owner");
  const policyHash = entries.get("policy_hash");
  const updatedAt = entries.get("updated_at");
  if (!credentialRoot || !epoch || !owner || !policyHash || !updatedAt) throw new Error("Gate state is missing required fields");
  if (credentialRoot.switch().name !== "scvBytes" || policyHash.switch().name !== "scvBytes" || epoch.switch().name !== "scvU32" || owner.switch().name !== "scvAddress" || updatedAt.switch().name !== "scvU64") throw new Error("Gate state has unexpected field types");
  const ownerAddress = owner.address();
  if (ownerAddress.switch().name !== "scAddressTypeAccount") throw new Error("Gate owner is not an account address");
  return {
    owner: encodeEd25519PublicKey(Buffer.from(ownerAddress.accountId().ed25519())),
    policy_hash: Buffer.from(policyHash.bytes()),
    credential_root: Buffer.from(credentialRoot.bytes()),
    epoch: epoch.u32(),
    updated_at: BigInt(updatedAt.u64().toString()),
  };
}

function parseBoolean(value: xdr.ScVal): boolean {
  if (value.switch().name !== "scvBool") throw new Error("Boolean return value expected");
  return value.b();
}

async function simulateContractCall({ contractId, functionName, args, rpcUrl, sourceAccount }: { contractId: string; functionName: string; args: xdr.ScVal[]; rpcUrl: string; sourceAccount: string }) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: { transaction: buildReadOnlyTransactionXdr({ contractId, functionName, args, sourceAccount }) },
    }),
  });
  if (!response.ok) throw new Error(`RPC simulation failed with HTTP ${response.status}`);
  const json = await response.json() as { error?: unknown; result?: { results?: Array<{ xdr?: string }> } };
  const resultXdr = json.result?.results?.[0]?.xdr;
  if (json.error || !resultXdr) throw new Error("Contract simulation failed");
  return xdr.ScVal.fromXDR(resultXdr, "base64");
}

export async function readGateState({ contractId, gateId, rpcUrl = "https://soroban-testnet.stellar.org", sourceAccount }: { contractId: string; gateId: string; rpcUrl?: string; sourceAccount: string }): Promise<GateState> {
  return parseGateState(await simulateContractCall({ contractId, functionName: "get_gate", args: [nativeToScVal(gateId)], rpcUrl, sourceAccount }));
}

export async function readRevocationState({ contractId, gateId, revocationHash, rpcUrl = "https://soroban-testnet.stellar.org", sourceAccount }: { contractId: string; gateId: string; revocationHash: string; rpcUrl?: string; sourceAccount: string }): Promise<boolean> {
  return parseBoolean(await simulateContractCall({ contractId, functionName: "is_revoked", args: [nativeToScVal(gateId), nativeToScVal(Buffer.from(revocationHash, "hex"))], rpcUrl, sourceAccount }));
}
