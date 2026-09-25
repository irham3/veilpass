import "server-only";

class VerifierGate {
  private active = 0;
  async run<T>(operation: () => Promise<T>, timeoutMs = 45_000): Promise<T | null> {
    const maxActive = Number.parseInt(process.env.VERIFIER_MAX_CONCURRENCY ?? "8", 10);
    if (this.active >= maxActive) {
      console.error(`[verifier-gate] Concurrency limit reached (${this.active}/${maxActive})`);
      return null;
    }
    this.active += 1;
    const pending = operation();
    let timer: ReturnType<typeof setTimeout>;
    const effectiveTimeout = Number.parseInt(process.env.VERIFIER_TIMEOUT_MS ?? String(timeoutMs), 10);
    const result = await Promise.race([pending, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), effectiveTimeout); })]);
    clearTimeout(timer!);
    if (result === null) {
      console.error(`[verifier-gate] Verification operation timed out after ${effectiveTimeout}ms`);
      void pending.finally(() => { this.active -= 1; });
      return null;
    }
    this.active -= 1;
    return result;
  }
}

declare global { var veilPassVerifierGate: VerifierGate | undefined; }
export const verifierGate = globalThis.veilPassVerifierGate ?? new VerifierGate();
if (process.env.NODE_ENV !== "production") globalThis.veilPassVerifierGate = verifierGate;
