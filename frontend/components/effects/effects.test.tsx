// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PixelTransition } from "./pixel-transition";
import { SpotlightCard } from "./spotlight-card";

describe("visual effect components", () => {
  it("shows the selected transition panel and keeps the decorative grid hidden", () => {
    const { rerender, container } = render(<PixelTransition active={false} first={<span>Before</span>} second={<span>After</span>} />);
    expect(screen.getByText("Before")).toBeTruthy();
    expect(container.querySelectorAll(".pixel-transition-grid i")).toHaveLength(16);
    expect(container.querySelector(".pixel-transition-grid")?.getAttribute("aria-hidden")).toBe("true");
    rerender(<PixelTransition active first={<span>Before</span>} second={<span>After</span>} className="custom" />);
    expect(screen.getByText("After")).toBeTruthy();
    expect(container.firstElementChild?.classList.contains("custom")).toBe(true);
  });

  it("tracks pointer position relative to the card bounds", () => {
    const { container } = render(<SpotlightCard>Spotlight content</SpotlightCard>);
    const card = container.firstElementChild as HTMLDivElement;
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({ left: 10, top: 20, right: 110, bottom: 120, width: 100, height: 100, x: 10, y: 20, toJSON: () => ({}) });
    fireEvent.mouseMove(card, { clientX: 36, clientY: 47 });
    expect(card.style.getPropertyValue("--spot-x")).toBe("26px");
    expect(card.style.getPropertyValue("--spot-y")).toBe("27px");
  });
});
