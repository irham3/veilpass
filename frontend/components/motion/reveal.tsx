"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type ReactNode, type Ref, useRef } from "react";

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

  useGSAP(() => {
    const node = ref.current;
    if (!node) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      gsap.set(node, { clearProps: "all" });
      return;
    }

    const delaySeconds = { none: 0, short: 0.09, medium: 0.16, long: 0.24 }[delay];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          gsap.to(node, {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.76,
            delay: delaySeconds,
            ease: "power3.out",
            overwrite: true,
          });
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, { scope: ref, dependencies: [delay] });

  const props = {
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
