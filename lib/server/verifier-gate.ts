import "server-only";

class VerifierGate {
  private active = 0;
  async run<T>(operation: () => Promise<T>, timeoutMs = 10_000): Promise<T | null> {
    if (this.active >= 4) return null;
    this.active += 1;
    const pending = operation();
    let timer: ReturnType<typeof setTimeout>;
    const result = await Promise.race([pending, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); })]);
    clearTimeout(timer!);
    if (result === null) { void pending.finally(() => { this.active -= 1; }); return null; }
    this.active -= 1;
    return result;
  }
}

declare global { var veilPassVerifierGate: VerifierGate | undefined; }
export const verifierGate = globalThis.veilPassVerifierGate ?? new VerifierGate();
if (process.env.NODE_ENV !== "production") globalThis.veilPassVerifierGate = verifierGate;
