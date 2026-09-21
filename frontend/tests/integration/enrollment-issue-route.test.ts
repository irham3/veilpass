import { NextRequest } from "next/server";
import { Keypair } from "@stellar/stellar-sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { consume, issueCredential } = vi.hoisted(() => ({
  consume: vi.fn(),
  issueCredential: vi.fn(),
}));

vi.mock("@/lib/server/enrollment-store", () => ({
  durableEnrollmentStoreConfigured: true,
  enrollmentStore: { consume },
}));

vi.mock("@/lib/server/credential-tree", () => ({
  CredentialTreeIssueError: class CredentialTreeIssueError extends Error {},
  durableCredentialTreeStoreConfigured: true,
  credentialTreeStore: { issue: issueCredential },
}));

vi.mock("@/lib/server/credential-issuance", () => ({
  buildIssuedCredentialPayload: vi.fn(() => ({ gateId: "premium-holder", credential: "fixture" })),
  issuedCredentialCanonical: vi.fn(() => "canonical-credential"),
}));

vi.mock("@/lib/server/gate-policy", () => ({
  getGatePolicy: vi.fn(async () => ({ epoch: 1, credentialRoot: "0".repeat(64) })),
}));

vi.mock("@/lib/server/root-publisher", () => ({
  gateRootPublisherConfigured: true,
  publishCredentialRoot: vi.fn(),
}));

import { POST } from "@/app/api/enrollment/issue/route";

const challengeId = "2fe46d77-e928-44be-8725-8bbbd1c18df7";
const message = "VeilPass enrollment\norigin:http://localhost:3000\ngate:premium-holder\nnonce:test";

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/enrollment/issue", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

function payload(keypair: Keypair, signature: Buffer) {
  return {
    challengeId,
    address: keypair.publicKey(),
    message,
    gateId: "premium-holder",
    signature: signature.toString("base64"),
    commitment: "1".repeat(64),
    credentialSalt: "2".repeat(64),
  };
}

describe("POST /api/enrollment/issue Freighter boundary", () => {
  beforeEach(() => {
    consume.mockReset();
    consume.mockResolvedValue(true);
    issueCredential.mockReset();
    issueCredential.mockResolvedValue({ pathElements: [], pathIndices: [], root: "0".repeat(64), leafIndex: 0 });
    process.env.VEILPASS_ISSUER_SECRET = Keypair.random().secret();
  });

  it("accepts a Freighter-compatible SEP-53 signature", async () => {
    const wallet = Keypair.random();
    const response = await POST(request(payload(wallet, wallet.signMessage(message))));

    expect(response.status).toBe(201);
    expect(consume).toHaveBeenCalledOnce();
    expect(issueCredential).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toMatchObject({ gateId: "premium-holder", credential: "fixture" });
  });

  it("rejects a raw Ed25519 signature without consuming the challenge", async () => {
    const wallet = Keypair.random();
    const response = await POST(request(payload(wallet, wallet.sign(Buffer.from(message)))));

    expect(response.status).toBe(400);
    expect(consume).not.toHaveBeenCalled();
    expect(issueCredential).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "PROOF_INVALID" });
  });

  it("rejects a signature from another wallet without consuming the challenge", async () => {
    const selectedWallet = Keypair.random();
    const otherWallet = Keypair.random();
    const response = await POST(request(payload(selectedWallet, otherWallet.signMessage(message))));

    expect(response.status).toBe(400);
    expect(consume).not.toHaveBeenCalled();
    expect(issueCredential).not.toHaveBeenCalled();
  });
});
