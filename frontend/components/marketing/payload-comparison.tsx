import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";

import { Reveal } from "@/components/motion/reveal";

const rows = [["Wallet address", true, false], ["Public balance", true, false], ["Cross-site identifier", true, false], ["Gate eligibility", true, true], ["Origin-scoped ID", false, true]] as const;

export function PayloadComparison() {
  return (
    <section aria-labelledby="comparison-title" className="section-paper-slit px-5 py-24 text-paper-50 lg:px-8 lg:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-signal-400">Default wallet login leaks too much</p>
            <h2 id="comparison-title" className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.055em] text-balance sm:text-6xl">
              Send the verdict. Keep the account.
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-paper-200 lg:justify-self-end">
            A normal wallet login gives the host a public account. VeilPass returns the fields needed to grant access.
          </p>
        </Reveal>

        <Reveal delay="short" className="mt-14 rounded-[2.15rem] border border-paper-50/10 bg-paper-50/[0.055] p-1.5 shadow-[0_30px_100px_rgba(0,0,0,0.22)]">
          <div className="overflow-hidden rounded-[1.65rem] bg-paper-50 text-ink-950">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[46%]" />
                <col className="w-[27%]" />
                <col className="w-[27%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-ink-950/10 bg-paper-100 text-left text-xs font-semibold uppercase tracking-[0.08em] text-ink-600 sm:text-sm sm:normal-case sm:tracking-normal">
                  <th scope="col" className="px-4 py-4 align-middle sm:px-5">
                    Host receives
                  </th>
                  <th scope="col" className="border-l border-ink-950/10 px-3 py-4 align-middle sm:px-5">
                    <span className="flex items-center justify-center gap-2 text-center">
                      <EyeIcon aria-hidden="true" size={18} />
                      Standard
                    </span>
                  </th>
                  <th scope="col" className="border-l border-ink-950/10 bg-signal-400/15 px-3 py-4 align-middle sm:px-5">
                    <span className="flex items-center justify-center gap-2 text-center">
                      <EyeSlashIcon aria-hidden="true" size={18} />
                      VeilPass
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, standard, veilpass]) => (
                  <tr key={label} className="border-b border-ink-950/10 last:border-0">
                    <th scope="row" className="px-4 py-4 text-left text-sm font-medium sm:px-5">
                      {label}
                    </th>
                    <td className="border-l border-ink-950/10 px-3 py-4 text-center">
                      <span role="img" aria-label={standard ? "Shared" : "Not shared"} className="inline-grid place-items-center">
                        {standard ? <CheckCircleIcon size={22} weight="fill" /> : <XCircleIcon size={22} className="text-ink-400" />}
                      </span>
                    </td>
                    <td className="border-l border-ink-950/10 bg-signal-400/10 px-3 py-4 text-center">
                      <span role="img" aria-label={veilpass ? "Shared" : "Not shared"} className="inline-grid place-items-center">
                        {veilpass ? <CheckCircleIcon size={22} weight="fill" className="text-signal-700" /> : <XCircleIcon size={22} className="text-signal-700" />}
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
