"use client";

import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { useState } from "react";

import { cn } from "@/lib/utils";

const questions = [
  {
    question: "Does VeilPass make the user anonymous?",
    answer:
      "No. The issuer still sees the wallet during enrollment. VeilPass keeps the wallet address out of the host response and gives each origin its own private app ID.",
  },
  {
    question: "Can I deploy this from the frontend folder?",
    answer:
      "Yes. Vercel should use frontend as the project root. Keep the contract workspace at the repo root and configure production env vars in Vercel.",
  },
  {
    question: "Is the proof already zero knowledge?",
    answer:
      "The MVP ships a deterministic proof adapter labeled Simulated proof. The Noir circuit boundary is included for the future ZK path and is not misrepresented as production ZK.",
  },
  {
    question: "What does the host receive?",
    answer:
      "The host receives an eligibility verdict, gate ID, epoch, expiry, origin, and a private app ID scoped to that origin. It does not receive the Stellar wallet address.",
  },
] as const;

export function LandingFaq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-3">
      {questions.map((item, index) => {
        const expanded = open === index;

        return (
          <article
            key={item.question}
            className="rounded-[1.65rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-signal-400/28"
          >
            <div className="rounded-[1.25rem] bg-ink-950/70">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? -1 : index)}
                className="flex w-full items-center justify-between gap-5 rounded-[1.25rem] px-5 py-5 text-left text-base font-medium text-paper-50 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-signal-400 sm:px-6"
              >
                <span>{item.question}</span>
                <CaretDownIcon
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 text-signal-400 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    expanded && "rotate-180",
                  )}
                  size={18}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-6 text-sm leading-7 text-paper-200 sm:px-6">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
