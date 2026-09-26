// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const animation = vi.hoisted(() => ({
  set: vi.fn(),
  to: vi.fn(),
  create: vi.fn(),
  refresh: vi.fn(),
  add: vi.fn(),
  revert: vi.fn(),
  clamp: (min: number, max: number, value: number) => Math.min(max, Math.max(min, value)),
  lastObserver: undefined as FakeObserver | undefined,
  conditions: { desktop: true, reducedMotion: false } as { desktop?: boolean; reducedMotion?: boolean },
}));

class FakeObserver {
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    animation.lastObserver = this;
  }
  enter(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

vi.mock("@gsap/react", async () => {
  const react = await import("react");
  return { useGSAP: (callback: () => void | (() => void)) => react.useLayoutEffect(callback, []) };
});
vi.mock("gsap", () => ({
  default: {
    registerPlugin: vi.fn(),
    set: animation.set,
    to: animation.to,
    matchMedia: () => ({
      add: (conditions: unknown, callback: (context: { conditions: typeof animation.conditions }) => void) => {
        animation.add(conditions);
        callback({ conditions: animation.conditions });
      },
      revert: animation.revert,
    }),
    utils: { clamp: animation.clamp },
  },
}));
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { create: animation.create, refresh: animation.refresh } }));

import { LandingScrollMagnet } from "./landing-scroll-magnet";
import { Reveal } from "./reveal";

beforeEach(() => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false }))));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  animation.set.mockClear();
  animation.to.mockClear();
  animation.create.mockClear();
  animation.refresh.mockClear();
  animation.add.mockClear();
  animation.revert.mockClear();
  animation.lastObserver = undefined;
  animation.conditions = { desktop: true, reducedMotion: false };
});

describe("Reveal", () => {
  it.each([
    ["div", "none"],
    ["section", "short"],
    ["article", "medium"],
    ["aside", "long"],
  ] as const)("renders the %s semantic element and reveals it after intersection", (as, delay) => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    render(<Reveal as={as} delay={delay} className="custom-reveal">Accessible content</Reveal>);
    const content = screen.getByText("Accessible content");
    expect(content.tagName.toLowerCase()).toBe(as);
    expect(content).toHaveClass("reveal-motion", "custom-reveal");
    expect(animation.set).toHaveBeenCalledWith(content, { y: 18 });
    expect(animation.lastObserver?.observe).toHaveBeenCalledWith(content);
    animation.lastObserver?.enter(false);
    expect(animation.to).not.toHaveBeenCalled();
    animation.lastObserver?.enter(true);
    expect(animation.to).toHaveBeenCalledWith(content, expect.objectContaining({ y: 0, overwrite: true }));
    const tween = animation.to.mock.calls[0][1] as { delay: number; onComplete: () => void };
    expect(tween.delay).toBe(({ none: 0, short: 0.09, medium: 0.16, long: 0.24 })[delay]);
    tween.onComplete();
    expect(content).toHaveStyle({ willChange: "auto" });
    expect(animation.lastObserver?.disconnect).toHaveBeenCalled();
  });

  it("clears animation styles for reduced motion and tolerates a missing observer", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    const reduced = render(<Reveal>Reduced motion content</Reveal>);
    expect(animation.set).toHaveBeenCalledWith(screen.getByText("Reduced motion content"), { clearProps: "all" });
    reduced.unmount();

    vi.unstubAllGlobals();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    render(<Reveal>Observer unavailable content</Reveal>);
    expect(animation.set).not.toHaveBeenCalledWith(screen.getByText("Observer unavailable content"), { y: 18 });
  });
});

describe("LandingScrollMagnet", () => {
  it("creates a nearby-anchor snap and refreshes after layout", () => {
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => { callback(1); return 9; }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const { container, unmount } = render(<LandingScrollMagnet><section data-scroll-magnet /><section data-scroll-magnet /></LandingScrollMagnet>);
    const root = container.firstElementChild as HTMLDivElement;
    const sections = root.querySelectorAll<HTMLElement>("[data-scroll-magnet]");
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({ top: 0 } as DOMRect);
    Object.defineProperty(root, "offsetHeight", { configurable: true, value: 1_768 });
    vi.spyOn(sections[0], "getBoundingClientRect").mockReturnValue({ top: 400 } as DOMRect);
    vi.spyOn(sections[1], "getBoundingClientRect").mockReturnValue({ top: 1_200 } as DOMRect);

    expect(animation.create).toHaveBeenCalledWith(expect.objectContaining({ id: "landing-scroll-magnet" }));
    expect(animation.refresh).toHaveBeenCalledOnce();
    const config = animation.create.mock.calls[0][0] as { snap: { snapTo: (progress: number) => number } };
    expect(config.snap.snapTo(0.24)).toBeCloseTo(0.24);
    expect(config.snap.snapTo(0.35)).toBeCloseTo(0.32);
    unmount();
    expect(animation.revert).toHaveBeenCalledOnce();
  });

  it("skips desktop snapping for reduced motion and when no sections are marked", () => {
    animation.conditions = { desktop: false, reducedMotion: false };
    render(<LandingScrollMagnet><section data-scroll-magnet /></LandingScrollMagnet>);
    expect(animation.create).not.toHaveBeenCalled();
    cleanup();

    animation.conditions = { desktop: true, reducedMotion: true };
    render(<LandingScrollMagnet><section data-scroll-magnet /></LandingScrollMagnet>);
    expect(animation.create).not.toHaveBeenCalled();
    cleanup();

    animation.conditions = { desktop: true, reducedMotion: false };
    render(<LandingScrollMagnet><section>Unmarked</section></LandingScrollMagnet>);
    expect(animation.create).not.toHaveBeenCalled();
  });
});
