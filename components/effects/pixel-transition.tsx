"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Restrained, dependency-free adaptation of React Bits PixelTransition. */
export function PixelTransition({ active, first, second, className }: { active: boolean; first: ReactNode; second: ReactNode; className?: string }) {
  return <div className={cn("pixel-transition", "is-animating", className)}><div className="pixel-transition-content">{active ? second : first}</div><div key={String(active)} aria-hidden="true" className="pixel-transition-grid">{Array.from({ length: 16 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 8}ms` }} />)}</div></div>;
}
