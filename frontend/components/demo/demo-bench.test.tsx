// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DemoBench } from "./demo-bench";

afterEach(cleanup);

describe("DemoBench", () => {
  it("compares the standard payload, successful scoped logins, replay, and revocation", async () => {
    render(<DemoBench />);

    expect(screen.getByText("No host session yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Replay last challenge/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /Standard wallet login/ }));
    expect(screen.getByText("Standard wallet login at App A")).toBeInTheDocument();
    expect(screen.getByText("REJECT")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Login with VeilPass/ }));
    expect(screen.getByText("VeilPass login at App A")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("PASS")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Replay last challenge/ })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /Replay last challenge/ }));
    expect(screen.getByText("Replayed challenge")).toBeInTheDocument();
    expect(screen.getAllByText("REJECT").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole("button", { name: /Revoke credential/ }));
    expect(screen.getByText("Credential revoked")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revoke credential/ })).toBeDisabled();
  }, 15_000);

  it("isolates App B results and reset clears the event history and simulation state", async () => {
    render(<DemoBench />);
    const appBTab = screen.getByRole("tab", { name: /App B/ });
    fireEvent.mouseDown(appBTab, { button: 0, ctrlKey: false });
    await waitFor(() => expect(appBTab).toHaveAttribute("aria-selected", "true"));
    expect(screen.getAllByText("Private feedback")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /Login with VeilPass/ }));
    expect(screen.getByText("VeilPass login at App B")).toBeInTheDocument();

    const log = screen.getByRole("list", { name: "Verification log entries" });
    expect(within(log).getByText("PASS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Revoke credential/ }));
    expect(screen.getByText("Credential revoked")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reset bench/ }));
    expect(screen.getByText("Credential active")).toBeInTheDocument();
    expect(screen.getByText("Actions appear here with minimized outcomes. No wallet address is written to this log.")).toBeInTheDocument();
    expect(screen.queryByText("VeilPass login at App B")).not.toBeInTheDocument();
  });
});
