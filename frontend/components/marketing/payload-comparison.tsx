import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";

import { Reveal } from "@/components/motion/reveal";

const rows = [
  ["Stellar wallet address", true, false],
  ["Public account activity", true, false],
  ["Same ID across apps", true, false],
  ["Gate eligibility verdict", true, true],
  ["Origin-scoped returning ID", false, true],
] as const;

export function PayloadComparison() {
  return (
    <section aria-labelledby="comparison-title" className="section-paper-slit px-4 py-16 text-paper-50 sm:px-6 sm:py-24 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal className="grid gap-6 sm:gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal-400">Default wallet login leaks too much</p>
            <h2 id="comparison-title" className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.055em] text-balance sm:text-4xl lg:text-6xl">
              Send the verdict. Keep the account.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-paper-200 sm:text-lg sm:leading-8 lg:justify-self-end">
            A normal wallet login gives the host a public account it can reuse and inspect. VeilPass returns only the access fields the host needs.
          </p>
        </Reveal>

        <Reveal delay="short" className="mt-10 rounded-[1.75rem] border border-paper-50/10 bg-paper-50/[0.035] p-1.5 shadow-[0_30px_100px_rgba(0,0,0,0.26)] sm:mt-14 sm:rounded-[2.15rem]">
          <div className="overflow-hidden rounded-[1.3rem] border border-paper-50/8 bg-ink-950/88 text-paper-50 sm:rounded-[1.65rem]">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                {/* More space for label on mobile, shrink on wider screens */}
                <col className="w-[48%] sm:w-[46%]" />
                <col className="w-[26%] sm:w-[27%]" />
                <col className="w-[26%] sm:w-[27%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-paper-50/10 bg-paper-50/[0.045] text-left font-semibold text-paper-200">
                  <th scope="col" className="px-3 py-3 align-middle text-[0.6rem] uppercase tracking-[0.06em] sm:px-5 sm:py-4 sm:text-xs sm:tracking-[0.08em]">
                    Host can learn
                  </th>
                  <th scope="col" className="border-l border-paper-50/10 px-2 py-3 align-middle sm:px-3 sm:py-4 lg:px-5">
                    <span className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-2">
                      <EyeIcon aria-hidden="true" size={16} className="sm:size-[18px]" />
                      <span className="text-[0.6rem] uppercase tracking-[0.06em] sm:text-xs sm:normal-case sm:tracking-normal">Wallet</span>
                    </span>
                  </th>
                  <th scope="col" className="border-l border-paper-50/10 bg-signal-400/10 px-2 py-3 align-middle text-signal-400 sm:px-3 sm:py-4 lg:px-5">
                    <span className="flex flex-col items-center justify-center gap-1 text-center sm:flex-row sm:gap-2">
                      <EyeSlashIcon aria-hidden="true" size={16} className="sm:size-[18px]" />
                      <span className="text-[0.6rem] uppercase tracking-[0.06em] sm:text-xs sm:normal-case sm:tracking-normal">VeilPass</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, standard, veilpass]) => (
                  <tr key={label} className="border-b border-paper-50/8 last:border-0">
                    <th scope="row" className="px-3 py-3 text-left text-[0.7rem] font-medium leading-5 sm:px-5 sm:py-4 sm:text-sm sm:leading-none">
                      {label}
                    </th>
                    <td className="border-l border-paper-50/8 px-2 py-3 text-center sm:px-3 sm:py-4 lg:px-5">
                      <span role="img" aria-label={standard ? "Shared" : "Not shared"} className="inline-grid place-items-center">
                        {standard ? <CheckCircleIcon size={18} weight="fill" className="text-paper-50 sm:size-[22px]" /> : <XCircleIcon size={18} className="text-paper-200/55 sm:size-[22px]" />}
                      </span>
                    </td>
                    <td className="border-l border-paper-50/8 bg-signal-400/[0.075] px-2 py-3 text-center sm:px-3 sm:py-4 lg:px-5">
                      <span role="img" aria-label={veilpass ? "Shared" : "Not shared"} className="inline-grid place-items-center">
                        {veilpass ? <CheckCircleIcon size={18} weight="fill" className="text-signal-400 sm:size-[22px]" /> : <XCircleIcon size={18} className="text-signal-400 sm:size-[22px]" />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
