import { normalizeOrigin, challengeResponseSchema, verifyResultSchema, type VerifiedLogin } from "@veilpass/shared";
import { validatePopupMessage } from "./channel";

export class VeilPassError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "VeilPassError"; }
}

export class VeilPass {
  private readonly loginOrigin: string;
  constructor({ loginOrigin }: { loginOrigin: string }) { this.loginOrigin = normalizeOrigin(loginOrigin); }

  async login({ gateId, timeoutMs = 120_000 }: { gateId: string; timeoutMs?: number }): Promise<VerifiedLogin> {
    const createChallenge = async () => {
      const challengeResponse = await fetch("/api/challenges", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gateId }) });
      return challengeResponseSchema.parse(await challengeResponse.json());
    };
    const state = crypto.randomUUID();
    const url = new URL("/login", this.loginOrigin);
    url.searchParams.set("gateId", gateId);
    url.searchParams.set("state", state);
    const hostOrigin = normalizeOrigin(window.location.origin);
    url.searchParams.set("hostOrigin", hostOrigin);
    const popup = window.open(url, "veilpass-login", "popup,width=520,height=720");
    if (!popup) throw new VeilPassError("POPUP_BLOCKED", "Allow the VeilPass login window and try again.");
    return new Promise((resolve, reject) => {
      let settled = false;
      let verificationStarted = false;
      let challengePromise: ReturnType<typeof createChallenge> | null = null;
      const cleanup = () => {
        settled = true;
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timeout);
        window.clearInterval(closedPoll);
      };
      const sendChallenge = () => {
        challengePromise ??= createChallenge();
        void challengePromise.then((challenge) => {
          if (!settled && !popup.closed) popup.postMessage({ type: "veilpass:challenge", state, challenge }, this.loginOrigin);
        }).catch((error) => {
          if (settled) return;
          console.error("[VeilPass SDK] createChallenge failed:", error);
          cleanup();
          popup.close();
          reject(new VeilPassError("SERVICE_UNAVAILABLE", error instanceof Error ? error.message : "Could not create a login challenge"));
        });
      };
      const onMessage = (event: MessageEvent) => {
        if (event.origin === this.loginOrigin && event.source === popup && event.data?.type === "veilpass:ready" && event.data?.state === state) {
          sendChallenge();
          return;
        }
        const result = validatePopupMessage({ event, popup, loginOrigin: this.loginOrigin, state });
        if (!result || settled || verificationStarted) return;
        verificationStarted = true;
        void fetch("/api/verify", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) }).then(async (response) => {
          const raw = await response.json();
          const verified = verifyResultSchema.parse(raw);
          cleanup(); popup.close();
          if (verified.ok) resolve(verified); else {
            console.error("[VeilPass SDK] /api/verify returned verification failure:", verified.error, raw);
            reject(new VeilPassError(verified.error, `VeilPass login failed: ${verified.error}`));
          }
        }).catch((error) => {
          console.error("[VeilPass SDK] /api/verify request failed:", error);
          cleanup(); popup.close(); reject(new VeilPassError("SERVICE_UNAVAILABLE", error instanceof Error ? error.message : "Verification unavailable"));
        });
      };
      const timeout = window.setTimeout(() => { cleanup(); popup.close(); reject(new VeilPassError("TIMEOUT", "VeilPass login timed out.")); }, timeoutMs);
      const closedPoll = window.setInterval(() => {
        if (!popup.closed) return;
        cleanup();
        reject(new VeilPassError("POPUP_CLOSED", "The VeilPass login window was closed before login finished."));
      }, 400);
      window.addEventListener("message", onMessage);
    });
  }
}
