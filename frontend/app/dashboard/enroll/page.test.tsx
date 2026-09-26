import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { EnrollmentFlow } = vi.hoisted(() => ({ EnrollmentFlow: vi.fn((props: { assetRule: { type: string; code: string; minimum: number }; returnTo?: string }) => <div>{`${props.assetRule.type}:${props.assetRule.code}:${props.assetRule.minimum}:${props.returnTo ?? "none"}`}</div>) }));
vi.mock("@/components/enrollment/enrollment-flow", () => ({ EnrollmentFlow }));

import EnrollPage from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("operator enrollment page", () => {
  it("defaults to native XLM and only preserves the local login return path", async () => {
    vi.stubEnv("VEILPASS_MIN_BALANCE", "2");
    const page = await EnrollPage({ searchParams: Promise.resolve({ returnTo: "/login?gateId=premium-holder" }) });
    expect(renderToStaticMarkup(page)).toContain("native:XLM:2:/login?gateId=premium-holder");
    const unsafe = await EnrollPage({ searchParams: Promise.resolve({ returnTo: "https://attacker.example" }) });
    expect(renderToStaticMarkup(unsafe)).toContain("native:XLM:2:none");
  });

  it("supports the configured credit rule and uses a safe default for malformed amounts", async () => {
    vi.stubEnv("VEILPASS_ASSET_TYPE", "credit");
    vi.stubEnv("VEILPASS_ASSET_CODE", "VPT");
    vi.stubEnv("VEILPASS_MIN_BALANCE", "not-a-number");
    const page = await EnrollPage({ searchParams: Promise.resolve({}) });
    expect(renderToStaticMarkup(page)).toContain("credit:VPT:1:none");
  });
});
