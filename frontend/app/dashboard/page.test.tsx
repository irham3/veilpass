import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { connection, readGateState } = vi.hoisted(() => ({ connection: vi.fn(async () => undefined), readGateState: vi.fn() }));
vi.mock("next/server", () => ({ connection }));
vi.mock("@/packages/shared/src/contract", () => ({ readGateState }));
vi.mock("@/components/motion/reveal", () => ({ Reveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/dashboard/contract-actions", () => ({ ContractActions: ({ configured }: { configured: boolean }) => <div>Admin actions: {String(configured)}</div> }));

import DashboardPage from "./page";

beforeEach(() => {
  vi.unstubAllEnvs();
  readGateState.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("operator dashboard page", () => {
  it("shows setup-required state until the contract and source account are configured", async () => {
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("Waiting for contract configuration");
    expect(html).toContain("Not configured");
    expect(html).toContain("Admin actions: false");
    expect(readGateState).not.toHaveBeenCalled();
  });

  it("renders live gate state and safely handles an unavailable RPC", async () => {
    vi.stubEnv("NEXT_PUBLIC_VEILPASS_CONTRACT_ID", "contract-id");
    vi.stubEnv("NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT", "source-account");
    readGateState.mockResolvedValueOnce({ owner: "owner", policy_hash: Buffer.alloc(32, 1), credential_root: Buffer.alloc(32, 2), epoch: 7, updated_at: 1_700_000_000 });
    const live = renderToStaticMarkup(await DashboardPage());
    expect(live).toContain("Read live from Stellar RPC");
    expect(live).toContain("Admin actions: true");
    expect(live).toContain("owner");
    readGateState.mockRejectedValueOnce(new Error("RPC unavailable"));
    const unavailable = renderToStaticMarkup(await DashboardPage());
    expect(unavailable).toContain("Contract configured, but gate state could not be read");
  });
});
