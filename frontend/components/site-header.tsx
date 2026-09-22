"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ListIcon } from "@phosphor-icons/react/List";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { enrollmentUrl, publicAppLinks } from "@/lib/public-app-links";
import { cn } from "@/lib/utils";

const links = [
  { href: publicAppLinks.home, label: "Overview" },
  { href: `${publicAppLinks.home}/#two-app-demo`, label: "Two-app demo" },
  { href: `${publicAppLinks.home}/docs`, label: "Docs" },
  { href: `${publicAppLinks.login}/dashboard`, label: "Gate dashboard" },
];

export function SiteHeader() {
  const primaryAction = { href: enrollmentUrl, label: "Enroll with Freighter" };

  return (
    <header
      className="sticky top-0 z-50 h-20 px-4 pt-3 sm:px-5"
    >
      <div
        className="liquid-glass-web relative mx-auto flex h-15 max-w-7xl items-center justify-between overflow-hidden rounded-full border border-paper-50/14 bg-ink-950/82 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl lg:px-5"
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-signal-400/60 to-transparent"
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
              "transition-transform duration-200 ease-out group-hover:scale-[1.025]",
            )}
          />
        </a>
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-5 xl:flex"
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
          <Button
            asChild
            size="default"
            className="group min-h-11 rounded-full px-4 pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <a href={primaryAction.href}>
              {primaryAction.label}
              <span aria-hidden="true" className="ml-1 grid size-7 place-items-center rounded-full bg-ink-950/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRightIcon size={15} />
              </span>
            </a>
          </Button>
        </nav>
        <Button
          asChild
          size="default"
          className="group hidden min-h-11 rounded-full px-4 pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] sm:inline-flex xl:hidden"
        >
          <a href={primaryAction.href}>
            Enroll
            <span aria-hidden="true" className="ml-1 grid size-7 place-items-center rounded-full bg-ink-950/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
              <ArrowRightIcon size={15} />
            </span>
          </a>
        </Button>
        <Sheet>
          <SheetTrigger asChild className="xl:hidden">
            <Button variant="ghost" size="icon" aria-label="Open navigation" className="size-11 rounded-full">
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
              <Button asChild className="mt-4 min-h-12 rounded-full px-5">
                <a href={primaryAction.href}>{primaryAction.label}</a>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
