// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { RouteTransition } from "./route-transition";

describe("route transitions", () => {
  beforeEach(() => usePathname.mockReset());
  it("leaves article navigation stable on docs routes", () => {
    usePathname.mockReturnValue("/docs/privacy");
    const { container } = render(<RouteTransition><p>Privacy article</p></RouteTransition>);
    expect(screen.getByText("Privacy article")).toBeTruthy();
    expect(container.firstElementChild?.classList.contains("route-transition")).toBe(false);
  });
  it("keys the transition wrapper to non-docs routes", () => {
    usePathname.mockReturnValue("/dashboard");
    const { container } = render(<RouteTransition><p>Dashboard</p></RouteTransition>);
    expect(container.firstElementChild?.classList.contains("route-transition")).toBe(true);
  });
});
