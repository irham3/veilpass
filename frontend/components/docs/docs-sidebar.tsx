"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { docNav } from "@/lib/docs/content";

const groups = [
  { label: "Start", slugs: ["", "quickstart", "enrollment"] },
  { label: "Integrate", slugs: ["client", "server", "identity", "contract"] },
  { label: "Reference", slugs: ["errors", "privacy", "threat-model", "api", "examples"] },
] as const;

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="rounded-[1.9rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 lg:sticky lg:top-24 lg:h-fit">
      <div className="rounded-[1.4rem] bg-ink-950/82 p-5">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-paper-200">Documentation</p>
        <p className="mt-2 text-sm leading-6 text-paper-200">Choose a topic. The sidebar stays in place while only the article changes.</p>
        <nav aria-label="Documentation" className="mt-5 space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-paper-200/75">{group.label}</p>
              <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
                {docNav.filter(([slug]) => (group.slugs as readonly string[]).includes(slug)).map(([slug, label]) => {
                  const href = `/docs${slug ? `/${slug}` : ""}`;
                  const active = pathname === href;
                  return (
                    <Link
                      key={slug}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className="rounded-xl px-3 py-2.5 text-sm text-paper-200 transition-colors duration-150 hover:bg-paper-50/8 hover:text-paper-50 aria-[current=page]:bg-signal-400/12 aria-[current=page]:font-medium aria-[current=page]:text-paper-50"
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
