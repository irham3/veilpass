// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HostDemo } from "./host-demo";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("@veilpass/sdk", () => ({
  VeilPass: class { login = login; },
  VeilPassError: class extends Error { constructor(readonly code: string) { super(code); } },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const props = { label: "App A", purpose: "Holder dashboard", accent: "Private access" };

describe("host session display", () => {
  it("shows the browser's actual HTTPS host origin instead of a local SSR fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })));

    render(<HostDemo {...props} />);

    await waitFor(() => expect(screen.getByText(window.location.origin)).toBeInTheDocument());
    expect(screen.queryByText("http://app-a.localhost:3000")).not.toBeInTheDocument();
  });

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

  it("uses a safe server origin placeholder and reports session transport failures", async () => {
    expect(renderToStaticMarkup(<HostDemo {...props} />)).toContain("Detecting host origin…");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<HostDemo {...props} />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Session status unavailable"));
  });

  it("ignores a session response after its host page unmounts", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const { unmount } = render(<HostDemo {...props} />);
    unmount();
    resolve(new Response(JSON.stringify({ authenticated: true, privateAppId: "vp_late" }), { status: 200 }));
    await Promise.resolve();
    await Promise.resolve();

    let reject!: (error: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((_resolve, failed) => { reject = failed; })));
    const failedLate = render(<HostDemo {...props} />);
    failedLate.unmount();
    reject(new Error("late offline request"));
    await Promise.resolve();
    await Promise.resolve();
  });

  it("keeps a completed SDK login when a late signed-out session check finishes", async () => {
    let resolve!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    login.mockReset().mockResolvedValue({ ok: true, privateAppId: "vp_private_2", gateId: "premium-holder" });
    render(<HostDemo {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Host session verified");
    resolve(new Response(JSON.stringify({ authenticated: false }), { status: 200 }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Host session verified"));
  });

  it("keeps a completed SDK login when a late session transport error finishes", async () => {
    let reject!: (error: unknown) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((_resolve, failed) => { reject = failed; })));
    login.mockReset().mockResolvedValue({ ok: true, privateAppId: "vp_private_3", gateId: "premium-holder" });
    render(<HostDemo {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Host session verified");
    reject(new Error("late offline response"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Host session verified"));
  });

  it("shows a scoped login result and the SDK error code", async () => {
    login.mockReset().mockResolvedValueOnce({ ok: true, privateAppId: "vp_private_1", gateId: "premium-holder" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })));
    render(<HostDemo {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Host session verified");
    expect(screen.getByText(/vp_private_1/)).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith({ gateId: "premium-holder" });

    login.mockRejectedValueOnce(Object.assign(new Error("wallet denied"), { code: "WALLET_REJECTED", name: "VeilPassError" }));
    fireEvent.click(screen.getByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("SERVICE_UNAVAILABLE");
    expect(screen.queryByText(/vp_private_1/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-verified-icon")).not.toBeInTheDocument();
  });

  it("shows a revoked new login without displaying the previous successful payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })));
    login.mockReset().mockResolvedValueOnce({ ok: true, privateAppId: "vp_private_old", gateId: "premium-holder" });
    render(<HostDemo {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Host session verified");
    login.mockRejectedValueOnce(new (await import("@veilpass/sdk")).VeilPassError("CREDENTIAL_REVOKED", "revoked"));
    fireEvent.click(screen.getByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("CREDENTIAL_REVOKED");
    expect(screen.queryByText(/vp_private_old/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("session-verified-icon")).not.toBeInTheDocument();
    expect(screen.getByText(/existing host session may remain active/i)).toBeInTheDocument();
  });

  it("shows the SDK's typed failure code and generic runtime fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })));
    render(<HostDemo {...props} />);
    login.mockReset().mockRejectedValueOnce(new (await import("@veilpass/sdk")).VeilPassError("POPUP_BLOCKED", "blocked"));
    fireEvent.click(await screen.findByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("POPUP_BLOCKED");

    login.mockRejectedValueOnce("unexpected");
    fireEvent.click(screen.getByRole("button", { name: "Login with VeilPass" }));
    expect(await screen.findByRole("status")).toHaveTextContent("SERVICE_UNAVAILABLE");
  });

  it("blocks a second login while the first popup is still pending", async () => {
    let finish!: (value: { ok: true; privateAppId: string; gateId: string }) => void;
    login.mockReset().mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: false }), { status: 401 })));
    render(<HostDemo {...props} />);
    const button = await screen.findByRole("button", { name: "Login with VeilPass" });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });

    expect(login).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
    await act(async () => finish({ ok: true, privateAppId: "vp_private_pending", gateId: "premium-holder" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Host session verified");
  });

  it("restores the authenticated marker from the server session without an SDK result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ authenticated: true, privateAppId: "vp_restored" }), { status: 200 })));
    const { container } = render(<HostDemo {...props} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Host session verified"));
    expect(screen.queryByText(/vp_restored/)).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="session-restored"]')).toBeNull();
    expect(screen.getByTestId("session-verified-icon")).toBeInTheDocument();
  });
});
