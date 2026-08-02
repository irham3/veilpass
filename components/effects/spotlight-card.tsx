"use client";

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

/** Adapted from React Bits SpotlightCard. See THIRD_PARTY_NOTICES.md. */
export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  function move(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }
  return <div ref={ref} onMouseMove={move} className={cn("spotlight-card", className)} style={{ "--spot-x": "50%", "--spot-y": "50%" } as CSSProperties}>{children}</div>;
}
