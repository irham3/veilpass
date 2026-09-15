"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { ListIcon } from "@phosphor-icons/react/List";
import Image from "next/image";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { enrollmentUrl, publicAppLinks } from "@/lib/public-app-links";
import { cn } from "@/lib/utils";

const links = [
  { href: publicAppLinks.home, label: "Overview" },
  { href: `${publicAppLinks.home}/demo`, label: "Demo" },
  { href: `${publicAppLinks.login}/dashboard`, label: "Dashboard" },
  { href: `${publicAppLinks.home}/docs`, label: "Docs" },
];

const liveApps = [
  { href: publicAppLinks.appA, label: "App A", description: "Holder dashboard" },
  { href: publicAppLinks.appB, label: "App B", description: "Private feedback" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 18);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className={cn(
        "sticky top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        scrolled ? "px-3 pt-2" : "px-4 pt-4",
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex items-center justify-between overflow-hidden rounded-full border px-4 backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] lg:px-5",
          scrolled
            ? "h-13 max-w-5xl scale-[0.985] border-signal-400/24 bg-ink-950/90 shadow-[0_16px_70px_rgba(0,0,0,0.48),0_0_0_1px_rgba(185,245,208,0.03)]"
            : "h-16 max-w-7xl border-paper-50/10 bg-ink-950/64 shadow-[0_18px_70px_rgba(0,0,0,0.24)]",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-10 bottom-0 h-px origin-center bg-gradient-to-r from-transparent via-signal-400/75 to-transparent transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
            scrolled ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0",
          )}
        />
        <a
          href={publicAppLinks.home}
          aria-label="VeilPass home"
          className="group shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Image
            src="/brand/veilpass-lockup-dark.svg"
            alt="VeilPass"
            width={132}
            height={28}
            priority
            className={cn(
              "transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.025]",
              scrolled && "scale-[0.94]",
            )}
          />
        </a>
        <nav
          aria-label="Primary navigation"
          className={cn(
            "hidden items-center transition-[gap] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] lg:flex",
            scrolled ? "gap-4" : "gap-5",
          )}
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "smooth-link text-sm text-paper-200 hover:-translate-y-0.5 hover:text-paper-50",
              )}
            >
              {link.label}
            </a>
          ))}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-paper-200 transition-colors hover:text-paper-50 [&::-webkit-details-marker]:hidden">
              Live apps
              <CaretDownIcon aria-hidden="true" size={14} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-7 w-64 rounded-2xl border border-paper-50/10 bg-ink-950/98 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
              <p className="px-3 py-2 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-paper-200">Separate trusted origins</p>
              {liveApps.map((app) => (
                <a key={app.href} href={app.href} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-paper-50/10">
                  <span className="block text-sm text-paper-50">{app.label}</span>
                  <span className="mt-0.5 block text-xs text-paper-200">{app.description}</span>
                </a>
              ))}
            </div>
          </details>
          <Button
            asChild
            size="sm"
            className="group rounded-full pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <a href={enrollmentUrl}>
              Enroll with Freighter
              <span aria-hidden="true" className="ml-1 grid size-7 place-items-center rounded-full bg-ink-950/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRightIcon size={15} />
              </span>
            </a>
          </Button>
        </nav>
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Open navigation" className="rounded-full">
              <ListIcon size={22} />
            </Button>
          </SheetTrigger>
          <SheetContent className="border-line-dark bg-ink-950/96 text-paper-50 backdrop-blur-2xl">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <nav aria-label="Mobile navigation" className="mt-14 flex flex-col gap-2">
              {links.map((link) => (
                <Button
                  key={link.href}
                  asChild
                  variant="ghost"
                  className="min-h-12 justify-start rounded-2xl text-base transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <a href={link.href}>{link.label}</a>
                </Button>
              ))}
              <p className="mt-5 px-3 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-paper-200">Live apps</p>
              {liveApps.map((app) => (
                <Button
                  key={app.href}
                  asChild
                  variant="ghost"
                  className="min-h-12 justify-start rounded-2xl text-base transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                >
                  <a href={app.href}>{app.label} — {app.description}</a>
                </Button>
              ))}
              <Button asChild className="mt-4 rounded-full">
                <a href={enrollmentUrl}>Enroll with Freighter</a>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
