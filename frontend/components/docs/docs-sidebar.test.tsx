// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("next/link", () => ({ default: ({ href, children, onClick, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props} onClick={(event) => { event.preventDefault(); onClick?.(event); }}>{children}</a> }));

import { DocsSidebar } from "./docs-sidebar";

describe("documentation sidebar", () => {
  beforeEach(() => usePathname.mockReturnValue("/docs/privacy"));

  it("marks the active article and closes the mobile menu after navigation", () => {
    const { container } = render(<DocsSidebar />);
    expect(screen.getAllByRole("link", { name: "Privacy model" })[0]?.getAttribute("aria-current")).toBe("page");
    const details = container.querySelector("details") as HTMLDetailsElement;
    details.setAttribute("open", "");
    fireEvent.click(screen.getAllByRole("link", { name: "Threat model" })[0]!);
    expect(details.hasAttribute("open")).toBe(false);
  });

  it("shows the overview label for an unmatched path", () => {
    usePathname.mockReturnValue("/docs/unknown");
    render(<DocsSidebar />);
    expect(screen.getByText(/Browse documentation/).textContent).toContain("Overview");
  });
});
