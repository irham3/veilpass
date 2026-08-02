export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-ink-950 px-5 py-20 text-paper-50 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-12 w-44 rounded-full bg-paper-50/8" />
        <div className="mt-16 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="h-24 max-w-2xl rounded-3xl bg-paper-50/8" />
            <div className="mt-6 h-6 max-w-xl rounded-full bg-paper-50/8" />
            <div className="mt-3 h-6 max-w-md rounded-full bg-paper-50/8" />
          </div>
          <div className="min-h-96 rounded-[2rem] border border-line-dark bg-ink-900/80" />
        </div>
      </div>
    </main>
  );
}
