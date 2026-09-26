// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark" }) }));
vi.mock("sonner", () => ({ Toaster: ({ theme, className, position }: { theme: string; className: string; position: string }) => <div data-testid="sonner" data-theme={theme} data-position={position} className={className} /> }));

import { Checkbox } from "./checkbox";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";
import { Badge } from "./badge";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";
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

  it("renders alert slots and the destructive variant with its action", () => {
    render(<Alert variant="destructive"><AlertTitle>Enrollment failed</AlertTitle><AlertDescription>Try again later.</AlertDescription><AlertAction><button>Retry</button></AlertAction></Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(alert).toHaveClass("text-destructive");
    expect(screen.getByText("Enrollment failed")).toHaveAttribute("data-slot", "alert-title");
    expect(screen.getByText("Try again later.")).toHaveAttribute("data-slot", "alert-description");
    expect(screen.getByRole("button", { name: "Retry" }).parentElement).toHaveAttribute("data-slot", "alert-action");
  });

  it("supports badge variants and renders its child as the interactive element", () => {
    render(<><Badge variant="outline">Testnet</Badge><Badge asChild variant="secondary"><a href="https://veilpass.dev/docs">Read docs</a></Badge></>);
    expect(screen.getByText("Testnet")).toHaveAttribute("data-variant", "outline");
    expect(screen.getByRole("link", { name: "Read docs" })).toHaveAttribute("data-variant", "secondary");
  });

  it("opens an accessible sheet with title, description, slots, and close controls", () => {
    render(<Sheet defaultOpen><SheetTrigger>Open settings</SheetTrigger><SheetContent side="left"><SheetHeader><SheetTitle>Settings</SheetTitle><SheetDescription>Manage your gate.</SheetDescription></SheetHeader><SheetFooter><SheetClose>Done</SheetClose></SheetFooter></SheetContent></Sheet>);
    const dialog = screen.getByRole("dialog", { name: "Settings" });
    expect(dialog).toHaveAttribute("data-slot", "sheet-content");
    expect(dialog).toHaveAttribute("data-side", "left");
    expect(screen.getByText("Manage your gate.")).toHaveAttribute("data-slot", "sheet-description");
    expect(screen.getByText("Settings").parentElement).toHaveAttribute("data-slot", "sheet-header");
    expect(screen.getByRole("button", { name: "Done" })).toHaveAttribute("data-slot", "sheet-close");
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("allows a right side sheet without the built-in close button", () => {
    render(<Sheet defaultOpen><SheetContent showCloseButton={false}><p>Compact panel</p></SheetContent></Sheet>);
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right");
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
