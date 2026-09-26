// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark" }) }));
vi.mock("sonner", () => ({ Toaster: ({ theme, className, position }: { theme: string; className: string; position: string }) => <div data-testid="sonner" data-theme={theme} data-position={position} className={className} /> }));

import { Checkbox } from "./checkbox";
import { Toaster } from "./sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

beforeEach(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("UI primitives", () => {
  it("exposes a keyboard-operable labeled checkbox", () => {
    render(<label>Consent <Checkbox aria-label="Consent" /></label>);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("data-slot")).toBe("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("provides the selected theme to the notification host", () => {
    render(<Toaster position="top-center" />);
    expect(screen.getByTestId("sonner").getAttribute("data-theme")).toBe("dark");
    expect(screen.getByTestId("sonner").getAttribute("data-position")).toBe("top-center");
  });

  it("wraps tooltip pieces in a provider and applies the content offset", () => {
    render(<TooltipProvider delayDuration={10}><Tooltip defaultOpen><TooltipTrigger>Help</TooltipTrigger><TooltipContent sideOffset={6}>More information</TooltipContent></Tooltip></TooltipProvider>);
    expect(screen.getByText("Help")).toBeTruthy();
    expect(screen.getByText("Help").getAttribute("data-slot")).toBe("tooltip-trigger");
    expect(screen.getByText("More information").getAttribute("data-slot")).toBe("tooltip-content");
  });
});
