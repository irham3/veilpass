// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { publicAppLinks } from "@/lib/public-app-links";

import { SiteHeader } from "./site-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("SiteHeader", () => {
  it("keeps the product navigation concise and sends visitors to the dedicated origins", () => {
    render(<SiteHeader />);

    expect(screen.queryByText("Live apps")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Overview" })[0]).toHaveAttribute("href", publicAppLinks.home);
    expect(screen.getAllByRole("link", { name: "Two-app demo" })[0]).toHaveAttribute("href", `${publicAppLinks.home}/demo`);
    expect(screen.getAllByRole("link", { name: "Gate dashboard" })[0]).toHaveAttribute("href", `${publicAppLinks.login}/dashboard`);
    expect(screen.getAllByRole("link", { name: "Enroll with Freighter" })[0]).toHaveAttribute("href", `${publicAppLinks.login}/dashboard/enroll`);
  });

  it("keeps a stable, Apple-adjacent glass navigation surface", () => {
    const { container } = render(<SiteHeader />);
    const header = container.querySelector("header");
    const bar = header?.firstElementChild;

    expect(header).toHaveClass("h-20");
    expect(bar).toHaveClass("h-15", "max-w-7xl", "liquid-glass-web", "backdrop-blur-xl");
  });
});
