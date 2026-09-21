import { DocsSidebar } from "@/components/docs/docs-sidebar";

export default function DocsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-ink-950 text-paper-50">
      <div className="aperture-field relative px-5 py-10 sm:py-12 lg:px-8 lg:py-16">
        <div aria-hidden="true" className="aperture-ring absolute right-[-14rem] top-6 size-[32rem] rounded-full opacity-20" />
        <div className="relative mx-auto grid max-w-7xl gap-5 lg:grid-cols-[17rem_1fr] lg:gap-7">
          <DocsSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
