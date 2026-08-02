import Link from "next/link";

import { EnrollmentFlow } from "@/components/enrollment/enrollment-flow";
import { Reveal } from "@/components/motion/reveal";

export default function EnrollPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink-950 text-paper-50">
      <main className="aperture-field relative px-5 py-14 lg:px-8 lg:py-20">
        <div aria-hidden="true" className="aperture-ring absolute right-[-12rem] top-4 size-[30rem] rounded-full opacity-30" />
        <div className="relative mx-auto max-w-5xl">
          <Reveal>
            <Link href="/dashboard" className="smooth-link text-sm text-paper-200 hover:text-paper-50">
              Back to dashboard
            </Link>
            <div className="mt-8 max-w-3xl">
              <p className="eyebrow">Enrollment</p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-balance sm:text-7xl">
                Create a local credential.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-paper-200">
                Freighter proves wallet control. The host still gets no wallet address.
              </p>
            </div>
          </Reveal>
          <Reveal delay="short" className="mt-10">
            <EnrollmentFlow />
          </Reveal>
        </div>
      </main>
    </div>
  );
}
