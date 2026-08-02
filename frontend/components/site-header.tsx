"use client";

import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ListIcon } from "@phosphor-icons/react/List";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/demo", label: "Demo" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  const pathname = usePathname();
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
        "sticky top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        scrolled ? "px-3 pt-2" : "px-4 pt-4",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between rounded-full border px-4 backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] lg:px-5",
          scrolled
            ? "h-14 border-signal-400/18 bg-ink-950/92 shadow-[0_14px_60px_rgba(0,0,0,0.42)]"
            : "h-16 border-paper-50/10 bg-ink-950/76 shadow-[0_18px_70px_rgba(0,0,0,0.28)]",
        )}
      >
        <Link
          href="/"
          aria-label="VeilPass home"
          className="group shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Image
            src="/brand/veilpass-lockup-dark.svg"
            alt="VeilPass"
            width={132}
            height={28}
            priority
            className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.025]"
          />
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}
              className={cn(
                "smooth-link text-sm text-paper-200 hover:-translate-y-0.5 hover:text-paper-50",
                (pathname === link.href || pathname.startsWith(`${link.href}/`)) && "text-paper-50",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button
            asChild
            size="sm"
            className="group rounded-full pr-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            <Link href="/demo">
              Try private login
              <span aria-hidden="true" className="ml-1 grid size-7 place-items-center rounded-full bg-ink-950/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                <ArrowRightIcon size={15} />
              </span>
            </Link>
          </Button>
        </nav>
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
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
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))}
              <Button asChild className="mt-4 rounded-full">
                <Link href="/demo">Try private login</Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
