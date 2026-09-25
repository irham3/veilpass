// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CodeBlock } from "./code-block";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("documentation code block", () => {
  it("copies the exact integration snippet and confirms success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CodeBlock code={'const result = await veilpass.login({ gateId: "premium-holder" });'} language="ts" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copied" })).toBeVisible());
    expect(writeText).toHaveBeenCalledWith('const result = await veilpass.login({ gateId: "premium-holder" });');
  });

  it("shows a recoverable error when clipboard access is denied", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<CodeBlock code="npm install @veilpass/sdk" language="bash" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Copy failed" })).toBeVisible());
    expect(screen.getByText("npm install @veilpass/sdk")).toBeVisible();
  });
});
