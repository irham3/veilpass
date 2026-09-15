"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { ReactNode } from "react";
import { useRef } from "react";

import { magneticSnapPoint } from "@/lib/scroll-magnet";

gsap.registerPlugin(ScrollTrigger);

type LandingScrollMagnetProps = {
  children: ReactNode;
};

/**
 * A restrained, desktop-only scroll magnet for the landing page.
 *
 * Native scrolling always remains in charge: snap only engages after a short
 * pause and only when the reader is already close to a marked section.
 */
export function LandingScrollMagnet({ children }: LandingScrollMagnetProps) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const rootElement = root.current;

      if (!rootElement) {
        return;
      }

      const media = gsap.matchMedia();
      let refreshFrame: number | undefined;

      media.add(
        {
          desktop: "(min-width: 900px) and (pointer: fine)",
          reducedMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (!context.conditions?.desktop || context.conditions.reducedMotion) {
            return;
          }

          const sections = Array.from(
            rootElement.querySelectorAll<HTMLElement>("[data-scroll-magnet]"),
          );

          if (sections.length === 0) {
            return;
          }

          const progressPoints = () => {
            const rootTop =
              rootElement.getBoundingClientRect().top + window.scrollY;
            const scrollStart = rootTop;
            const scrollEnd = Math.max(
              scrollStart,
              rootTop + rootElement.offsetHeight - window.innerHeight,
            );
            const scrollRange = scrollEnd - scrollStart;

            if (scrollRange <= 0) {
              return [];
            }

            return sections.map((section) =>
              gsap.utils.clamp(
                0,
                1,
                (section.getBoundingClientRect().top + window.scrollY - 80 -
                  scrollStart) /
                  scrollRange,
              ),
            );
          };

          ScrollTrigger.create({
            id: "landing-scroll-magnet",
            trigger: rootElement,
            start: "top top",
            end: "bottom bottom",
            invalidateOnRefresh: true,
            snap: {
              snapTo: (progress) => magneticSnapPoint(progress, progressPoints()),
              delay: 0.14,
              duration: { min: 0.18, max: 0.5 },
              ease: "power3.out",
              inertia: true,
            },
          });

          refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
        },
      );

      return () => {
        if (refreshFrame !== undefined) {
          window.cancelAnimationFrame(refreshFrame);
        }

        media.revert();
      };
    },
    { scope: root },
  );

  return <div ref={root}>{children}</div>;
}
