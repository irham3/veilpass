import "server-only";

export class VerifierGate {
  private active = 0;
  async run<T>(operation: () => Promise<T>, timeoutMs = 45_000): Promise<T | null> {
    const maxActive = Number.parseInt(process.env.VERIFIER_MAX_CONCURRENCY ?? "8", 10);
    if (this.active >= maxActive) {
      console.error(JSON.stringify({ event: "verifier_unavailable", reason: "concurrency_limit" }));
      return null;
    }
    this.active += 1;
    const pending: Promise<T | null> = Promise.resolve().then(operation).catch((error: unknown) => {
      console.error(JSON.stringify({ event: "verifier_operation_failed", reason: error instanceof Error ? error.name : "unknown" }));
      return null;
    }).finally(() => { this.active -= 1; });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const effectiveTimeout = Number.parseInt(process.env.VERIFIER_TIMEOUT_MS ?? String(timeoutMs), 10);
    const result = await Promise.race([pending, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), effectiveTimeout); })]);
    if (timer) clearTimeout(timer);
    if (result === null) {
      console.error(JSON.stringify({ event: "verifier_unavailable", reason: "timeout" }));
      return null;
    }
    return result;
  }
}

declare global { var veilPassVerifierGate: VerifierGate | undefined; }
export const verifierGate = globalThis.veilPassVerifierGate ?? new VerifierGate();
if (process.env.NODE_ENV !== "production") globalThis.veilPassVerifierGate = verifierGate;
