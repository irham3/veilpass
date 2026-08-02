import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";

import { Reveal } from "@/components/motion/reveal";

const rows = [["Wallet address", true, false], ["Public balance", true, false], ["Cross-site identifier", true, false], ["Gate eligibility", true, true], ["Origin-scoped ID", false, true]] as const;

export function PayloadComparison() {
  return (
    <section aria-labelledby="comparison-title" className="bg-paper-50 px-5 py-24 text-ink-950 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal-700">Default wallet login leaks too much</p>
            <h2 id="comparison-title" className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl">
              Send the verdict. Keep the account.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-ink-600 lg:justify-self-end">
            A normal wallet login gives the host a public account. VeilPass returns the fields needed to grant access.
          </p>
        </Reveal>

        <Reveal delay="short" className="mt-14 rounded-[2.15rem] border border-ink-950/10 bg-white/70 p-1.5 shadow-[0_30px_100px_rgba(13,17,15,0.10)]">
          <div className="overflow-hidden rounded-[1.65rem] bg-white">
            <div className="grid grid-cols-[1.25fr_0.85fr_0.85fr] border-b border-ink-950/10 bg-paper-100 text-sm font-medium">
              <div className="p-4 sm:p-5">Host receives</div>
              <div className="border-l border-ink-950/10 p-4 sm:p-5">
                <EyeIcon className="mb-2" size={20} />
                Standard login
              </div>
              <div className="border-l border-ink-950/10 bg-signal-400/15 p-4 sm:p-5">
                <EyeSlashIcon className="mb-2" size={20} />
                VeilPass
              </div>
            </div>
            {rows.map(([label, standard, veilpass]) => (
              <div key={label} className="grid min-h-16 grid-cols-[1.25fr_0.85fr_0.85fr] border-b border-ink-950/10 last:border-0">
                <div className="flex items-center p-4 text-sm sm:p-5">{label}</div>
                <div role="img" className="grid place-items-center border-l border-ink-950/10 p-4" aria-label={standard ? "Shared" : "Not shared"}>
                  {standard ? <CheckCircleIcon size={22} weight="fill" /> : <XCircleIcon size={22} className="text-ink-400" />}
                </div>
                <div role="img" className="grid place-items-center border-l border-ink-950/10 bg-signal-400/10 p-4" aria-label={veilpass ? "Shared" : "Not shared"}>
                  {veilpass ? <CheckCircleIcon size={22} weight="fill" className="text-signal-700" /> : <XCircleIcon size={22} className="text-signal-700" />}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
