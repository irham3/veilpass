import { normalizeOrigin, challengeResponseSchema, verifyResultSchema, type VerifiedLogin } from "@veilpass/shared";
import { validatePopupMessage } from "./channel";

export class VeilPassError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "VeilPassError"; }
}

export class VeilPass {
  private readonly loginOrigin: string;
  constructor({ loginOrigin }: { loginOrigin: string }) { this.loginOrigin = normalizeOrigin(loginOrigin); }

  async login({ gateId, timeoutMs = 120_000 }: { gateId: string; timeoutMs?: number }): Promise<VerifiedLogin> {
    const challengeResponse = await fetch("/api/challenges", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gateId }) });
    const challenge = challengeResponseSchema.parse(await challengeResponse.json());
    const state = crypto.randomUUID();
    const url = new URL("/login", this.loginOrigin);
    url.searchParams.set("gateId", gateId);
    url.searchParams.set("state", state);
    const hostOrigin = normalizeOrigin(window.location.origin);
    url.searchParams.set("hostOrigin", hostOrigin);
    const popup = window.open(url, "veilpass-login", "popup,width=520,height=720");
    if (!popup) throw new VeilPassError("POPUP_BLOCKED", "Allow the VeilPass login window and try again.");
    return new Promise((resolve, reject) => {
      const cleanup = () => { window.removeEventListener("message", onMessage); window.clearTimeout(timeout); };
      const onMessage = (event: MessageEvent) => {
        if (event.origin === this.loginOrigin && event.source === popup && event.data?.type === "veilpass:ready" && event.data?.state === state) {
          popup.postMessage({ type: "veilpass:challenge", state, challenge }, this.loginOrigin);
          return;
        }
        const result = validatePopupMessage({ event, popup, loginOrigin: this.loginOrigin, state });
        if (!result) return;
        void fetch("/api/verify", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) }).then(async (response) => {
          const verified = verifyResultSchema.parse(await response.json());
          cleanup(); popup.close();
          if (verified.ok) resolve(verified); else reject(new VeilPassError(verified.error, `VeilPass login failed: ${verified.error}`));
        }).catch((error) => { cleanup(); popup.close(); reject(new VeilPassError("SERVICE_UNAVAILABLE", error instanceof Error ? error.message : "Verification unavailable")); });
      };
      const timeout = window.setTimeout(() => { cleanup(); popup.close(); reject(new VeilPassError("TIMEOUT", "VeilPass login timed out.")); }, timeoutMs);
      window.addEventListener("message", onMessage);
    });
  }
}
