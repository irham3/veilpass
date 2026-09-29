// @vitest-environment jsdom

import { Buffer } from "buffer";
import { describe, expect, it, vi } from "vitest";

describe("generated contract browser bootstrap", () => {
  it("installs Buffer only when the page does not already provide one", async () => {
    const browserWindow = window as Window & { Buffer?: typeof Buffer };
    Reflect.deleteProperty(browserWindow, "Buffer");
    vi.resetModules();
    await import("../src/index");
    expect(browserWindow.Buffer).toBe(Buffer);

    const existing = function ExistingBuffer() {};
    browserWindow.Buffer = existing as unknown as typeof Buffer;
    vi.resetModules();
    await import("../src/index");
    expect(browserWindow.Buffer).toBe(existing);
  });
});
