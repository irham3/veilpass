// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HostDemo } from "./host-demo";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const props = { app: "app-a" as const, label: "App A", purpose: "Holder dashboard", accent: "Private access" };

describe("host session display", () => {
  it("restores the server session state after a page reload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: true, privateAppId: "vp_app_1", gateId: "premium-holder" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<HostDemo {...props} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Host session verified"));
    expect(fetchMock).toHaveBeenCalledWith("/api/session", { credentials: "same-origin", cache: "no-store" });
  });

  it("shows an honest signed-out state for a missing cookie", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })));

    render(<HostDemo {...props} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No host session"));
  });
});
