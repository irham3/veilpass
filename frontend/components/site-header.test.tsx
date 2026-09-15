// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publicAppLinks } from "@/lib/public-app-links";

import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("SiteHeader", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0, writable: true });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the product navigation concise and sends visitors to the dedicated origins", () => {
    render(<SiteHeader />);

    expect(screen.queryByText("Live apps")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Overview" })[0]).toHaveAttribute("href", publicAppLinks.home);
    expect(screen.getAllByRole("link", { name: "Two-app demo" })[0]).toHaveAttribute("href", `${publicAppLinks.home}/demo`);
    expect(screen.getAllByRole("link", { name: "Gate dashboard" })[0]).toHaveAttribute("href", `${publicAppLinks.login}/dashboard`);
    expect(screen.getAllByRole("link", { name: "Enroll with Freighter" })[0]).toHaveAttribute("href", `${publicAppLinks.login}/dashboard/enroll`);
  });

  it("keeps the header layout dimensions fixed while the scroll treatment changes", () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector("header");
    const bar = header?.firstElementChild;

    expect(header).toHaveClass("h-20");
    expect(bar).toHaveClass("h-15", "max-w-7xl");

    Object.defineProperty(window, "scrollY", { configurable: true, value: 32 });
    fireEvent.scroll(window);

    expect(header).toHaveClass("h-20");
    expect(bar).toHaveClass("h-15", "max-w-7xl");
  });
});
