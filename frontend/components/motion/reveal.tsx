"use client";

import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: "none" | "short" | "medium" | "long";
  as?: "div" | "section" | "article" | "aside";
};

export function Reveal({
  children,
  className,
  delay = "none",
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const props = {
    "data-visible": visible,
    "data-delay": delay,
    className: cn("reveal-motion", className),
  };

  if (as === "section") {
    return <section ref={ref as Ref<HTMLElement>} {...props}>{children}</section>;
  }

  if (as === "article") {
    return <article ref={ref as Ref<HTMLElement>} {...props}>{children}</article>;
  }

  if (as === "aside") {
    return <aside ref={ref as Ref<HTMLElement>} {...props}>{children}</aside>;
  }

  return <div ref={ref as Ref<HTMLDivElement>} {...props}>{children}</div>;
}
