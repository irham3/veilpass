import type { Metadata } from "next";
import Link from "next/link";

import { EnrollmentFlow } from "@/components/enrollment/enrollment-flow";
import { Reveal } from "@/components/motion/reveal";
import { publicAppLinks } from "@/lib/public-app-links";

export const metadata: Metadata = {
  title: "Enrollment",
  description:
    "Create a local VeilPass credential with Freighter on Stellar Testnet.",
  robots: {
    index: false,
    follow: false,
  },
};

function safeLoginReturnPath(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.startsWith("/login?")) return undefined;
  return value;
}

export default async function EnrollPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const returnTo = safeLoginReturnPath((await searchParams).returnTo);
  const rawMinimum = Number.parseFloat(process.env.VEILPASS_MIN_BALANCE ?? "1");
  const assetType: "credit" | "native" = process.env.VEILPASS_ASSET_TYPE?.trim().toLowerCase() === "credit" ? "credit" : "native";
  const assetRule = {
    type: assetType,
    code: assetType === "native" ? "XLM" : process.env.VEILPASS_ASSET_CODE ?? "USDC",
    issuer: assetType === "credit" ? process.env.VEILPASS_ASSET_ISSUER : undefined,
    minimum: Number.isFinite(rawMinimum) ? rawMinimum : 1,
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-ink-950 text-paper-50">
      <main className="aperture-field relative px-5 py-14 lg:px-8 lg:py-20">
        <div aria-hidden="true" className="aperture-ring absolute right-[-12rem] top-4 size-[30rem] rounded-full opacity-30" />
        <div className="relative mx-auto max-w-5xl">
          <Reveal>
            <Link href={returnTo ?? publicAppLinks.home} className="smooth-link text-sm text-paper-200 hover:text-paper-50">
              {returnTo ? "Back to private login" : "Back to VeilPass"}
            </Link>
            <div className="mt-7 max-w-2xl">
              <p className="eyebrow">Stellar Testnet enrollment</p>
              <h1 className="mt-3 text-4xl font-semibold leading-[0.96] tracking-[-0.05em] text-balance sm:text-5xl">
                Create a local credential.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-paper-200 sm:text-lg">
                Freighter proves wallet control. The host still gets no wallet address.
              </p>
            </div>
          </Reveal>
          <Reveal delay="short" className="mt-8">
            <EnrollmentFlow assetRule={assetRule} returnTo={returnTo} />
          </Reveal>
        </div>
      </main>
    </div>
  );
}
