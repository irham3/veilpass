import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { Keypair } from "@stellar/stellar-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consume, issueCredential, config } = vi.hoisted(() => ({
  consume: vi.fn(),
  issueCredential: vi.fn(),
  config: { enrollment: true, tree: true, publisher: true },
}));

vi.mock("@/lib/server/enrollment-store", () => ({
  get durableEnrollmentStoreConfigured() { return config.enrollment; },
  enrollmentStore: { consume },
}));

vi.mock("@/lib/server/credential-tree", () => ({
  CredentialTreeIssueError: class CredentialTreeIssueError extends Error {},
  get durableCredentialTreeStoreConfigured() { return config.tree; },
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
  get gateRootPublisherConfigured() { return config.publisher; },
  publishCredentialRoot: vi.fn(),
}));

import { POST } from "@/app/api/enrollment/issue/route";
import { getGatePolicy } from "@/lib/server/gate-policy";
import { buildIssuedCredentialPayload } from "@/lib/server/credential-issuance";
import { publishCredentialRoot } from "@/lib/server/root-publisher";
import { CredentialTreeIssueError } from "@/lib/server/credential-tree";

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
    config.enrollment = true;
    config.tree = true;
    config.publisher = true;
    consume.mockReset();
    consume.mockResolvedValue(true);
    issueCredential.mockReset();
    issueCredential.mockResolvedValue({ pathElements: [], pathIndices: [], root: "0".repeat(64), credentialRoot: "0".repeat(64), leafIndex: 0, leafNonce: "3".repeat(64), merklePath: [], pathIsRight: [], revocationHash: "4".repeat(64) });
    vi.stubEnv("VEILPASS_ISSUER_SECRET", Keypair.random().secret());
    vi.mocked(getGatePolicy).mockReset().mockResolvedValue({ active: true, epoch: 1, credentialRoot: "0".repeat(64) });
    vi.mocked(buildIssuedCredentialPayload).mockReset().mockImplementation(() => ({ gateId: "premium-holder", credential: "fixture" } as never));
    vi.mocked(publishCredentialRoot).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

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

  it("fails closed when durable issuance dependencies are absent in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const dependency of ["enrollment", "tree", "publisher"] as const) {
      config[dependency] = false;
      expect((await POST(request({}))).status).toBe(503);
      config[dependency] = true;
    }
    expect(consume).not.toHaveBeenCalled();
  });

  it("rejects a mismatched origin, malformed payload, and spent enrollment challenge", async () => {
    const wrong = new NextRequest("http://localhost:3000/api/enrollment/issue", {
      method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}",
    });
    expect((await POST(wrong)).status).toBe(403);
    expect((await POST(request({}))).status).toBe(400);

    const wallet = Keypair.random();
    consume.mockResolvedValueOnce(false);
    expect((await POST(request(payload(wallet, wallet.signMessage(message))))).status).toBe(400);
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before attempting wallet verification", async () => {
    const malformed = new NextRequest("http://localhost:3000/api/enrollment/issue", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: "{",
    });
    expect((await POST(malformed)).status).toBe(400);
    expect(consume).not.toHaveBeenCalled();
  });

  it("requires an issuer secret and valid gate policy before publishing a credential root", async () => {
    const wallet = Keypair.random();
    const signed = payload(wallet, wallet.signMessage(message));
    vi.stubEnv("VEILPASS_ISSUER_SECRET", "");
    expect((await POST(request(signed))).status).toBe(503);
    vi.stubEnv("VEILPASS_ISSUER_SECRET", "bad-secret");
    expect((await POST(request(signed))).status).toBe(503);
    vi.stubEnv("VEILPASS_ISSUER_SECRET", Keypair.random().secret());
    vi.mocked(getGatePolicy).mockRejectedValueOnce(new Error("RPC unavailable"));
    expect((await POST(request(signed))).status).toBe(503);
    vi.mocked(getGatePolicy).mockResolvedValueOnce({ active: false, epoch: 1, credentialRoot: "0".repeat(64) });
    expect((await POST(request(signed))).status).toBe(400);
    expect(issueCredential).not.toHaveBeenCalled();
  });

  it("rejects an invalid stored root and maps tree and payload failures to safe responses", async () => {
    const wallet = Keypair.random();
    const signed = payload(wallet, wallet.signMessage(message));
    vi.mocked(getGatePolicy).mockResolvedValueOnce({ active: true, epoch: 1, credentialRoot: "not-a-field" });
    expect((await POST(request(signed))).status).toBe(503);

    issueCredential.mockRejectedValueOnce(new CredentialTreeIssueError("publish_root"));
    expect((await POST(request(signed))).status).toBe(503);
    issueCredential.mockRejectedValueOnce("tree offline");
    expect((await POST(request(signed))).status).toBe(503);

    vi.mocked(buildIssuedCredentialPayload).mockImplementationOnce(() => { throw new Error("bad witness"); });
    expect((await POST(request(signed))).status).toBe(503);
    expect(publishCredentialRoot).not.toHaveBeenCalled();
  });

  it("publishes the root from the credential-tree callback and signs the returned payload", async () => {
    vi.mocked(buildIssuedCredentialPayload).mockImplementationOnce((input) => ({
      gateId: input.gateId,
      issuerPublicKey: input.issuerPublicKey,
    } as never));
    issueCredential.mockImplementationOnce(async (input: { publishRoot: (root: string) => Promise<void> }) => {
      await input.publishRoot("1".repeat(64));
      return { credentialRoot: "1".repeat(64), leafNonce: "3".repeat(64), revocationHash: "4".repeat(64) };
    });
    const wallet = Keypair.random();
    const response = await POST(request(payload(wallet, wallet.signMessage(message))));
    const signedCredential = await response.json();
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(publishCredentialRoot).toHaveBeenCalledWith({ gateId: "premium-holder", expectedEpoch: 1, newRoot: "1".repeat(64) });
    expect(Keypair.fromPublicKey(signedCredential.issuerPublicKey).verify(
      createHash("sha256").update("canonical-credential").digest(),
      Buffer.from(signedCredential.issuerSignature, "base64"),
    )).toBe(true);
  });
});
