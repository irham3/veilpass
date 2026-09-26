// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { isConnected, requestAccess, getNetworkDetails, signMessage, saveCredential, createCredentialSecrets, replace } = vi.hoisted(() => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetworkDetails: vi.fn(),
  signMessage: vi.fn(),
  saveCredential: vi.fn(),
  createCredentialSecrets: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@stellar/freighter-api", () => ({ isConnected, requestAccess, getNetworkDetails, signMessage, signTransaction: vi.fn() }));
vi.mock("@stellar/stellar-sdk", () => ({
  Asset: class {}, Horizon: { Server: class {} }, Networks: { TESTNET: "Test SDF Network ; September 2015" }, Operation: {}, TransactionBuilder: class {},
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/packages/credential/src/store", () => ({ saveCredential }));
vi.mock("@/packages/proof/src/noir", () => ({ createCredentialSecrets }));

import { enrollmentButtonLabel, enrollmentIssueMessage, FREIGHTER_INSTALL_URL, isFreighterMissing } from "./enrollment-flow";

describe("Freighter enrollment recovery", () => {
  it("detects the missing-extension error", () => {
    expect(isFreighterMissing("Freighter was not found. Install or unlock Freighter, then try again.")).toBe(true);
    expect(isFreighterMissing("Wallet access was rejected.")).toBe(false);
  });

  it("uses the official Freighter install URL", () => {
    expect(FREIGHTER_INSTALL_URL).toBe("https://freighter.app/");
  });

  it("turns enrollment API failures into actionable, non-alarming guidance", () => {
    expect(enrollmentIssueMessage("SERVICE_UNAVAILABLE", "req-123")).toContain("no funds were moved");
    expect(enrollmentIssueMessage("SERVICE_UNAVAILABLE", "req-123")).toContain("req-123");
    expect(enrollmentIssueMessage("CHALLENGE_SPENT")).toContain("fresh request");
    expect(enrollmentIssueMessage("PROOF_INVALID")).toContain("selected Freighter account");
  });

  it("explains why the enrollment button cannot be clicked and what happens while it runs", () => {
    expect(enrollmentButtonLabel({ disclosed: false, complete: false, busy: false, phase: "ready", usesNativeXlm: true })).toBe("Check the box above to continue");
    expect(enrollmentButtonLabel({ disclosed: true, complete: false, busy: true, phase: "connecting", usesNativeXlm: true })).toBe("Waiting for Freighter…");
    expect(enrollmentButtonLabel({ disclosed: true, complete: false, busy: true, phase: "signing", usesNativeXlm: true })).toBe("Approve the message in Freighter…");
    expect(enrollmentButtonLabel({ disclosed: true, complete: false, busy: true, phase: "issuing", usesNativeXlm: true })).toBe("Finishing enrollment…");
    expect(enrollmentButtonLabel({ disclosed: true, complete: true, busy: false, phase: "complete", usesNativeXlm: true })).toBe("Credential enrolled");
  });
});

const nativeRule = { type: "native" as const, code: "XLM", minimum: 1 };
const address = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
function approveDisclosure() {
  fireEvent.click(screen.getByRole("checkbox"));
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  isConnected.mockReset().mockResolvedValue({ isConnected: true });
  requestAccess.mockReset().mockResolvedValue({ address });
  getNetworkDetails.mockReset().mockResolvedValue({ networkPassphrase: "Test SDF Network ; September 2015" });
  signMessage.mockReset().mockResolvedValue({ signedMessage: "signed", signerAddress: address });
  saveCredential.mockReset().mockResolvedValue(undefined);
  createCredentialSecrets.mockReset().mockResolvedValue({ subjectSecret: "secret", credentialSalt: "2".repeat(64), commitment: "1".repeat(64) });
  replace.mockReset();
});

describe("enrollment interaction", () => {
  it("requires the privacy disclosure before enabling enrollment", () => {
    render(<EnrollmentFlow assetRule={nativeRule} />);
    expect(screen.getByRole("button", { name: "Check the box above to continue" })).toBeDisabled();
    approveDisclosure();
    expect(screen.getByRole("button", { name: "Connect Freighter and enroll" })).toBeEnabled();
    expect(screen.getByText("This demo checks for at least 1 XLM on Stellar Testnet. No custom asset, trustline, swap, or purchase is required.")).toBeInTheDocument();
  });

  it("gives an actionable missing-wallet error without calling the issuer", async () => {
    isConnected.mockResolvedValue({ isConnected: false });
    vi.stubGlobal("fetch", vi.fn());
    render(<EnrollmentFlow assetRule={nativeRule} />);
    approveDisclosure();
    fireEvent.click(screen.getByRole("button", { name: "Connect Freighter and enroll" }));

    expect(await screen.findByText("Enrollment could not continue")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Install or download Freighter/ })).toHaveAttribute("href", FREIGHTER_INSTALL_URL);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a wallet on the wrong network before eligibility or signing", async () => {
    getNetworkDetails.mockResolvedValue({ networkPassphrase: "Public Global Stellar Network ; September 2015" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<EnrollmentFlow assetRule={nativeRule} />);
    approveDisclosure();
    fireEvent.click(screen.getByRole("button", { name: "Connect Freighter and enroll" }));

    expect(await screen.findByText(/Switch Freighter to Stellar Testnet/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(signMessage).not.toHaveBeenCalled();
  });

  it("rejects a signature from a different account before sending it to the issuer", async () => {
    signMessage.mockResolvedValue({ signedMessage: "signed", signerAddress: "GOTHER" });
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ eligible: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ challengeId: "challenge-1", message: "one-time message", gateId: "premium-holder" }) }));
    const fetchMock = vi.mocked(fetch);
    render(<EnrollmentFlow assetRule={nativeRule} />);
    approveDisclosure();
    fireEvent.click(screen.getByRole("button", { name: "Connect Freighter and enroll" }));

    expect(await screen.findByText(/Freighter signed with a different account/)).toBeInTheDocument();
    expect(signMessage).toHaveBeenCalledWith("one-time message", expect.objectContaining({ address, networkPassphrase: "Test SDF Network ; September 2015" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(saveCredential).not.toHaveBeenCalled();
  });

  it("surfaces the issuer support reference and permits a fresh retry", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ eligible: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ challengeId: "challenge-1", message: "one-time message", gateId: "premium-holder" }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "SERVICE_UNAVAILABLE", requestId: "req-public-1" }) }));
    render(<EnrollmentFlow assetRule={nativeRule} />);
    approveDisclosure();
    fireEvent.click(screen.getByRole("button", { name: "Connect Freighter and enroll" }));

    expect(await screen.findByText(/Support reference: req-public-1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect Freighter and enroll" })).toBeEnabled();
    expect(saveCredential).not.toHaveBeenCalled();
  });
});

import { EnrollmentFlow } from "./enrollment-flow";
