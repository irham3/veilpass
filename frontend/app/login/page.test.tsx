import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { LoginSurface, notFound } = vi.hoisted(() => ({ LoginSurface: vi.fn(() => <div>Login surface fixture</div>), notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
vi.mock("@/components/login/login-surface", () => ({ LoginSurface }));
vi.mock("next/navigation", () => ({ notFound }));

import LoginPage from "./page";

beforeEach(() => { LoginSurface.mockClear(); notFound.mockClear(); });

describe("hosted login route", () => {
  it("normalizes the host origin before rendering the login surface", async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ gateId: "premium-holder", state: "state-1", hostOrigin: "https://app.example" }) });
    expect(renderToStaticMarkup(page)).toContain("Login surface fixture");
    expect(LoginSurface).toHaveBeenLastCalledWith({ gateId: "premium-holder", state: "state-1", hostOrigin: "https://app.example" }, undefined);
  });

  it("rejects invalid host origins and missing OAuth state", async () => {
    await expect(LoginPage({ searchParams: Promise.resolve({ gateId: "gate", state: "state", hostOrigin: "javascript:alert(1)" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(LoginPage({ searchParams: Promise.resolve({ hostOrigin: "https://app.example" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(2);
  });
});
