import "server-only";

import { randomBytes } from "node:crypto";
import { BarretenbergSync } from "@aztec/bb.js";
import postgres from "postgres";

import { canonicalFieldHex, fieldHexFromBytes, randomFieldHex } from "@/packages/shared/src/field";

export const CREDENTIAL_TREE_DEPTH = 16;
const ZERO_FIELD = "00".repeat(32);

export type MerkleWitness = {
  credentialRoot: string;
  leafIndex: number;
  leafNonce: string;
  merklePath: string[];
  pathIsRight: boolean[];
  revocationHash: string;
};

export type CredentialTreeIssueInput = {
  gateId: string;
  epoch: number;
  credentialCommitment: string;
  credentialSalt: string;
  expiresAt: string;
  expectedRoot: string;
  /** Publish exactly this proposed root before the issuer makes it usable. */
  publishRoot: (root: string) => Promise<void>;
};

export interface CredentialTreeStoreLike {
  issue(input: CredentialTreeIssueInput): Promise<MerkleWitness>;
  witnessForCredential(input: { gateId: string; credentialCommitment: string; expectedRoot: string }): Promise<MerkleWitness | null>;
}

type NodeMap = Map<string, string>;
type CredentialRecord = MerkleWitness & { credentialCommitment: string; credentialSalt: string; expiresAt: string; epoch: number };

let pedersenPromise: Promise<BarretenbergSync> | undefined;
async function getPedersen(): Promise<BarretenbergSync> {
  pedersenPromise ??= BarretenbergSync.new();
  return pedersenPromise;
}

async function pedersenHash(inputs: string[]): Promise<string> {
  const api = await getPedersen();
  const result = api.pedersenHash({ inputs: inputs.map(fieldBytes), hashIndex: 0 });
  return fieldHexFromBytes(result.hash);
}

function fieldBytes(value: string): Uint8Array {
  const hex = canonicalFieldHex(value);
  return Uint8Array.from(hex.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
}

function nodeKey(level: number, index: number): string { return `${level}:${index}`; }
function nodeValue(nodes: NodeMap, level: number, index: number): string { return nodes.get(nodeKey(level, index)) ?? ZERO_FIELD; }

export async function credentialLeaf(input: { credentialCommitment: string; gateIdHash: string; epoch: number; credentialExpirySeconds: number; leafNonce: string; revocationHash: string }): Promise<string> {
  return pedersenHash([
    input.credentialCommitment,
    input.gateIdHash,
    numberField(input.epoch),
    numberField(input.credentialExpirySeconds),
    input.leafNonce,
    input.revocationHash,
  ]);
}

export async function merkleWitnessForLeaf(nodes: NodeMap, leafIndex: number, leaf: string): Promise<Omit<MerkleWitness, "leafNonce" | "revocationHash">> {
  const merklePath: string[] = [];
  const pathIsRight: boolean[] = [];
  let index = leafIndex;
  let current = canonicalFieldHex(leaf);
  for (let level = 0; level < CREDENTIAL_TREE_DEPTH; level += 1) {
    const isRight = index % 2 === 1;
    const sibling = nodeValue(nodes, level, isRight ? index - 1 : index + 1);
    merklePath.push(sibling);
    pathIsRight.push(isRight);
    current = isRight ? await pedersenHash([sibling, current]) : await pedersenHash([current, sibling]);
    index = Math.floor(index / 2);
  }
  return { credentialRoot: current, leafIndex, merklePath, pathIsRight };
}

async function writeLeaf(nodes: NodeMap, leafIndex: number, leaf: string): Promise<void> {
  let index = leafIndex;
  let current = canonicalFieldHex(leaf);
  nodes.set(nodeKey(0, index), current);
  for (let level = 0; level < CREDENTIAL_TREE_DEPTH; level += 1) {
    const isRight = index % 2 === 1;
    const sibling = nodeValue(nodes, level, isRight ? index - 1 : index + 1);
    current = isRight ? await pedersenHash([sibling, current]) : await pedersenHash([current, sibling]);
    index = Math.floor(index / 2);
    nodes.set(nodeKey(level + 1, index), current);
  }
}

function numberField(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Expected a non-negative safe integer");
  const bytes = new Uint8Array(32);
  let remaining = value;
  for (let index = 31; index >= 0 && remaining > 0; index -= 1) {
    bytes[index] = remaining % 256;
    remaining = Math.floor(remaining / 256);
  }
  return fieldHexFromBytes(bytes);
}

function expirySeconds(expiresAt: string): number {
  const milliseconds = Date.parse(expiresAt);
  if (!Number.isFinite(milliseconds) || milliseconds <= Date.now()) throw new Error("Credential expiry must be in the future");
  return Math.floor(milliseconds / 1_000);
}

function chooseIndex(nodes: NodeMap): number {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const index = randomBytes(2).readUInt16BE(0);
    if (!nodes.has(nodeKey(0, index))) return index;
  }
  for (let index = 0; index < 2 ** CREDENTIAL_TREE_DEPTH; index += 1) if (!nodes.has(nodeKey(0, index))) return index;
  throw new Error("Credential tree is full");
}

export class InMemoryCredentialTreeStore implements CredentialTreeStoreLike {
  private readonly nodesByGate = new Map<string, NodeMap>();
  private readonly credentials = new Map<string, CredentialRecord>();
  private queue: Promise<void> = Promise.resolve();

  async issue(input: CredentialTreeIssueInput): Promise<MerkleWitness> {
    return this.atomic(async () => {
      const nodes = this.nodesByGate.get(input.gateId) ?? new Map<string, string>();
      const currentRoot = nodeValue(nodes, CREDENTIAL_TREE_DEPTH, 0);
      if (currentRoot !== canonicalFieldHex(input.expectedRoot)) throw new Error("Credential tree is out of sync with the contract root");
      const leafIndex = chooseIndex(nodes);
      const leafNonce = randomFieldHex(randomBytes(32));
      const revocationHash = randomFieldHex(randomBytes(32));
      const leaf = await credentialLeaf({
        credentialCommitment: input.credentialCommitment,
        gateIdHash: await deterministicGateIdHash(input.gateId),
        epoch: input.epoch,
        credentialExpirySeconds: expirySeconds(input.expiresAt),
        leafNonce,
        revocationHash,
      });
      const witness = await merkleWitnessForLeaf(nodes, leafIndex, leaf);
      await input.publishRoot(witness.credentialRoot);
      await writeLeaf(nodes, leafIndex, leaf);
      this.nodesByGate.set(input.gateId, nodes);
      const record: CredentialRecord = { ...witness, leafNonce, revocationHash, credentialCommitment: canonicalFieldHex(input.credentialCommitment), credentialSalt: canonicalFieldHex(input.credentialSalt), expiresAt: input.expiresAt, epoch: input.epoch };
      this.credentials.set(`${input.gateId}:${record.credentialCommitment}`, record);
      return record;
    });
  }

  async witnessForCredential({ gateId, credentialCommitment, expectedRoot }: { gateId: string; credentialCommitment: string; expectedRoot: string }): Promise<MerkleWitness | null> {
    const record = this.credentials.get(`${gateId}:${canonicalFieldHex(credentialCommitment)}`);
    const nodes = this.nodesByGate.get(gateId);
    if (!record || !nodes) return null;
    const leaf = await credentialLeaf({ credentialCommitment: record.credentialCommitment, gateIdHash: await deterministicGateIdHash(gateId), epoch: record.epoch, credentialExpirySeconds: expirySeconds(record.expiresAt), leafNonce: record.leafNonce, revocationHash: record.revocationHash });
    const witness = await merkleWitnessForLeaf(nodes, record.leafIndex, leaf);
    if (witness.credentialRoot !== canonicalFieldHex(expectedRoot)) return null;
    return { ...witness, leafNonce: record.leafNonce, revocationHash: record.revocationHash };
  }

  private async atomic<T>(operation: () => Promise<T>): Promise<T> {
    const before = this.queue;
    let release = () => {};
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await before;
    try { return await operation(); } finally { release(); }
  }
}

export class PostgresCredentialTreeStore implements CredentialTreeStoreLike {
  private readonly sql: ReturnType<typeof postgres>;

  constructor(url: string) { this.sql = postgres(url, { max: 6, idle_timeout: 20, prepare: false }); }

  async issue(input: CredentialTreeIssueInput): Promise<MerkleWitness> {
    return this.sql.begin(async (tx) => {
      await tx.unsafe("select pg_advisory_xact_lock(hashtext($1))", [input.gateId]);
      const nodes = await loadNodes(tx, input.gateId);
      if (nodeValue(nodes, CREDENTIAL_TREE_DEPTH, 0) !== canonicalFieldHex(input.expectedRoot)) throw new Error("Credential tree is out of sync with the contract root");
      const leafIndex = chooseIndex(nodes);
      const leafNonce = randomFieldHex(randomBytes(32));
      const revocationHash = randomFieldHex(randomBytes(32));
      const leaf = await credentialLeaf({ credentialCommitment: input.credentialCommitment, gateIdHash: await deterministicGateIdHash(input.gateId), epoch: input.epoch, credentialExpirySeconds: expirySeconds(input.expiresAt), leafNonce, revocationHash });
      const witness = await merkleWitnessForLeaf(nodes, leafIndex, leaf);
      await input.publishRoot(witness.credentialRoot);
      await writeLeaf(nodes, leafIndex, leaf);
      await saveNodes(tx, input.gateId, nodes);
      await tx.unsafe(
        "insert into veilpass.credential_merkle_credentials (commitment, gate_id, epoch, expires_at, credential_salt, leaf_nonce, revocation_hash, leaf_index, credential_root) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [canonicalFieldHex(input.credentialCommitment), input.gateId, input.epoch, new Date(input.expiresAt), canonicalFieldHex(input.credentialSalt), leafNonce, revocationHash, leafIndex, witness.credentialRoot],
      );
      return { ...witness, leafNonce, revocationHash };
    });
  }

  async witnessForCredential({ gateId, credentialCommitment, expectedRoot }: { gateId: string; credentialCommitment: string; expectedRoot: string }): Promise<MerkleWitness | null> {
    const commitment = canonicalFieldHex(credentialCommitment);
    const rows = await this.sql.unsafe<Array<{ commitment: string; epoch: number; expires_at: Date; credential_salt: string; leaf_nonce: string; revocation_hash: string; leaf_index: number }>>(
      "select commitment, epoch, expires_at, credential_salt, leaf_nonce, revocation_hash, leaf_index from veilpass.credential_merkle_credentials where gate_id = $1 and commitment = $2",
      [gateId, commitment],
    );
    const record = rows[0];
    if (!record || record.expires_at.getTime() <= Date.now()) return null;
    const nodes = await loadNodes(this.sql, gateId);
    const leaf = await credentialLeaf({ credentialCommitment: record.commitment, gateIdHash: await deterministicGateIdHash(gateId), epoch: record.epoch, credentialExpirySeconds: Math.floor(record.expires_at.getTime() / 1_000), leafNonce: record.leaf_nonce, revocationHash: record.revocation_hash });
    const witness = await merkleWitnessForLeaf(nodes, record.leaf_index, leaf);
    if (witness.credentialRoot !== canonicalFieldHex(expectedRoot)) return null;
    return { ...witness, leafNonce: record.leaf_nonce, revocationHash: record.revocation_hash };
  }
}

async function loadNodes(sql: { unsafe: ReturnType<typeof postgres>["unsafe"] }, gateId: string): Promise<NodeMap> {
  const rows = await sql.unsafe<Array<{ level: number; node_index: number; node_value: string }>>(
    "select level, node_index, node_value from veilpass.credential_tree_nodes where gate_id = $1",
    [gateId],
  );
  return new Map(rows.map((row) => [nodeKey(row.level, row.node_index), canonicalFieldHex(row.node_value)]));
}

async function saveNodes(sql: { unsafe: ReturnType<typeof postgres>["unsafe"] }, gateId: string, nodes: NodeMap): Promise<void> {
  for (const [key, value] of nodes) {
    const [level, index] = key.split(":").map(Number);
    await sql.unsafe(
      "insert into veilpass.credential_tree_nodes (gate_id, level, node_index, node_value) values ($1, $2, $3, $4) on conflict (gate_id, level, node_index) do update set node_value = excluded.node_value",
      [gateId, level, index, value],
    );
  }
}

async function deterministicGateIdHash(gateId: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  const digest = createHash("sha256").update(`veilpass:gate:${gateId}`).digest();
  digest[0] &= 0x1f;
  return fieldHexFromBytes(digest);
}

export const durableCredentialTreeStoreConfigured = Boolean(process.env.DATABASE_URL);
declare global { var veilPassCredentialTreeStore: InMemoryCredentialTreeStore | undefined; }
const memoryStore = globalThis.veilPassCredentialTreeStore ?? new InMemoryCredentialTreeStore();
if (process.env.NODE_ENV !== "production") globalThis.veilPassCredentialTreeStore = memoryStore;
export const credentialTreeStore: CredentialTreeStoreLike = process.env.DATABASE_URL ? new PostgresCredentialTreeStore(process.env.DATABASE_URL) : memoryStore;
