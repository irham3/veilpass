"use client";

import { ListIcon } from "@phosphor-icons/react/List";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const links = [
  { href: "/demo", label: "Demo" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/docs", label: "Docs" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line-dark/80 bg-ink-950/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="VeilPass home" className="shrink-0">
          <Image src="/brand/veilpass-lockup-light.svg" alt="VeilPass" width={132} height={28} priority />
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-7 md:flex">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm text-paper-200 transition-colors hover:text-paper-50">{link.label}</Link>)}
          <Button asChild size="sm"><Link href="/demo">Try private login</Link></Button>
        </nav>
        <Sheet>
          <SheetTrigger asChild className="md:hidden"><Button variant="ghost" size="icon" aria-label="Open navigation"><ListIcon size={22} /></Button></SheetTrigger>
          <SheetContent className="border-line-dark bg-ink-950 text-paper-50">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <nav aria-label="Mobile navigation" className="mt-14 flex flex-col gap-2">
              {links.map((link) => <Button key={link.href} asChild variant="ghost" className="min-h-12 justify-start text-base"><Link href={link.href}>{link.label}</Link></Button>)}
              <Button asChild className="mt-4"><Link href="/demo">Try private login</Link></Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
