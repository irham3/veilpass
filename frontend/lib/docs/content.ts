export type DocPage = { title: string; eyebrow: string; intro: string; sections: Array<{ heading: string; body: string; code?: string; language?: string }> };

export const docNav = [
  ["", "Overview"], ["quickstart", "Quickstart"], ["client", "Client SDK"], ["server", "Server verifier"], ["identity", "Identity semantics"], ["enrollment", "Enrollment"], ["contract", "Gate contract"], ["errors", "Errors"], ["privacy", "Privacy model"], ["threat-model", "Threat model"], ["api", "API reference"], ["examples", "Examples"],
] as const;

const install = `npm install @veilpass/sdk
# Pre-release local package in this repository: packages/sdk`;
const client = `import { VeilPass } from "@veilpass/sdk";

const veilpass = new VeilPass({
  loginOrigin: "https://login.veilpass.example",
});

const result = await veilpass.login({ gateId: "premium-holder" });
// result never contains the wallet address`;
const server = `import { verifyVeilPassProof } from "@veilpass/server";

const verified = await verifyVeilPassProof({
  proofResult,
  expectedOrigin: "https://app.example",
  expectedGateId: "premium-holder",
  policy,
  store: durableChallengeStore,
  verifyProof: verifyNoirMembershipProof,
  requestId,
});`;

export const docs: Record<string, DocPage> = {
  "": { title: "Developer documentation", eyebrow: "VeilPass docs", intro: "Integrate origin-scoped, eligibility-gated login without receiving the user's Stellar address.", sections: [
    { heading: "What the host receives", body: "A successful login returns only a private app ID, gate ID, epoch, normalized origin, and expiry. The host does not receive a wallet address, balance, credential commitment, revocation handle, nullifier, or proof." },
    { heading: "MVP status", body: "This repository is testnet software. The hosted login generates a local Noir/UltraHonk membership proof and the verifier checks it with the pinned verification key. The separately labeled Simulated proof endpoint is only a non-production compatibility fixture; /api/verify never accepts it." },
  ]},
  quickstart: { title: "Quickstart", eyebrow: "Start here", intro: "Create one challenge on the host, open the VeilPass login surface, verify once, then establish an opaque cookie session.", sections: [
    { heading: "Prerequisites", body: "Use Node.js 20 or later, a Freighter wallet connected to Stellar Testnet, and a testnet account funded with the asset required by your gate. Before starting a live service, run npm run env:validate; it reports configuration names only and never prints secret values." },
    { heading: "Install", body: "The SDK package is currently a pre-release workspace package, not a public npm release.", code: install, language: "bash" },
    { heading: "Client", body: "The popup channel validates the exact login origin, window source, request state, and response schema.", code: client },
    { heading: "Server", body: "Verification must happen on the host server. Supply a durable challenge/nullifier store and the pinned Noir verifier; a browser verdict is never sufficient.", code: server },
  ]},
  client: { title: "Client SDK", eyebrow: "Browser boundary", intro: "The client SDK opens a dedicated login window and accepts only a response from the configured login origin and the exact popup it created.", sections: [
    { heading: "Public surface", body: "VeilPass.login accepts a gateId and optional timeout. It resolves to VerifiedLogin or throws a typed VeilPassError. It never exposes the proof payload to host application code." , code: client },
    { heading: "Channel rules", body: "Always use an exact targetOrigin. Reject source mismatches, origin mismatches, stale state, malformed data, closed windows, and timeouts. Remove message listeners after every terminal outcome." },
  ]},
  server: { title: "Server verifier", eyebrow: "Trusted boundary", intro: "Bind each challenge to the trusted deployment origin and gate, then consume challenge and nullifier in one atomic operation.", sections: [
    { heading: "Verify", body: "The verifier checks schema, challenge digest, expiry, origin, gate, epoch, credential expiry, revocation state, proof validity, and nullifier uniqueness. The policy, durable store, verifier callback, and request ID are explicit server-owned dependencies.", code: server },
    { heading: "Response minimization", body: "Return the documented success object only. Error responses contain a safe public error code and request ID, never raw verifier diagnostics." },
  ]},
  identity: { title: "Identity semantics", eyebrow: "Scoped identity", intro: "privateAppId is stable for one credential, normalized origin, and gate epoch. It changes across origins.", sections: [
    { heading: "Do not reinterpret it", body: "A private app ID is not anonymous, global, permanent, or transferable. Epoch rotation, credential replacement, and policy changes can deliberately change it." },
    { heading: "Normalization", body: "Deployed origins must use HTTPS. HTTP is accepted only for loopback development. Origins are lowercase, default ports are removed, and paths, queries, fragments, user info, wildcards, and opaque origins are rejected." },
  ]},
  enrollment: { title: "Enrollment", eyebrow: "Issuer boundary", intro: "Enrollment is the one flow where the issuer observes the Stellar address and checks testnet eligibility.", sections: [
    { heading: "Disclosure", body: "Before Freighter connects, the UI must state that the issuer sees the address, the credential is stored locally, and losing browser data requires re-enrollment." },
    { heading: "Wallet rules", body: "Require Stellar Testnet. Use Freighter for address access and message signing. Never request or store a secret key." },
  ]},
  contract: { title: "Gate contract", eyebrow: "Stellar testnet", intro: "The Soroban gate registry stores public policy configuration, credential roots, epochs, revocation state, and gate ownership. Routine login remains off-chain.", sections: [
    { heading: "Lifecycle", body: "An administrator creates a gate, updates its root at the expected epoch, rotates an epoch with a replacement root, or revokes a credential hash. Each state change emits an event. Routine login does not submit a transaction." },
    { heading: "Local commands", body: "Run contract tests and the live testnet smoke from the frontend directory. A new deployment requires a funded testnet identity and explicit contract environment values.", code: "npm run contract:test\nnpm run contract:smoke\nstellar contract build --manifest-path ../contracts/veilpass-gate/Cargo.toml --locked", language: "bash" },
  ]},
  errors: { title: "Error reference", eyebrow: "Safe failures", intro: "Public errors are stable codes. Detailed causes belong in redacted server logs keyed by requestId.", sections: [
    { heading: "Wallet and policy", body: "WALLET_NOT_FOUND, WRONG_NETWORK, USER_REJECTED, and NOT_ELIGIBLE are safe client-facing outcomes." },
    { heading: "Challenge and binding", body: "CHALLENGE_EXPIRED, CHALLENGE_SPENT, ORIGIN_MISMATCH, GATE_MISMATCH, and STALE_EPOCH are not proof details and can be shown safely." },
    { heading: "Credential and verifier", body: "CREDENTIAL_EXPIRED, CREDENTIAL_REVOKED, PROOF_INVALID, and SERVICE_UNAVAILABLE are the remaining public outcomes. Retry is safe only for SERVICE_UNAVAILABLE with backoff and a fresh challenge." },
  ]},
  privacy: { title: "Privacy model", eyebrow: "Exact claim", intro: "VeilPass protects the Stellar wallet address from the host dApp during the login flow.", sections: [
    { heading: "What is hidden", body: "The host does not receive the wallet address, public balance, credential secrets, revocation handle, nullifier, or raw proof." },
    { heading: "What is not hidden", body: "The enrollment issuer sees the address. VeilPass does not hide IP address, browser fingerprint, timing, device state, or later on-chain actions. It is not a network anonymity system." },
  ]},
  "threat-model": { title: "Threat model", eyebrow: "Security model", intro: "The MVP defends against accidental wallet disclosure, cross-origin message confusion, challenge replay, nullifier reuse, and stale or revoked policy use.", sections: [
    { heading: "Trust assumptions", body: "The issuer, host verifier deployment, browser runtime, and configured verifier keys are trusted within their documented boundaries. Compromised endpoints, malicious extensions, traffic analysis, and endpoint malware are out of scope." },
    { heading: "Logging", body: "Log request ID, gate ID, normalized origin, public error code, and timing. Never log wallet addresses, proof bytes, credential secrets, nullifiers, revocation handles, or raw challenges." },
  ]},
  api: { title: "API reference", eyebrow: "Host and login endpoints", intro: "Host applications create a one-time challenge and submit a proof result. The hosted login also exposes enrollment, witness, session, and health endpoints.", sections: [
    { heading: "POST /api/challenges", body: "Creates 32 random bytes, stores only their digest, binds the record to trusted origin and gate, and expires it after five minutes.", code: `{"gateId":"premium-holder"}` },
    { heading: "POST /api/verify", body: "Validates and atomically consumes the challenge and login nullifier. A successful response contains only the documented VerifiedLogin fields.", code: `{"ok":true,"privateAppId":"vp_appA_72f1","gateId":"premium-holder","epoch":20391,"origin":"https://app.example","expiresAt":"2026-08-02T09:00:00.000Z"}`, language: "json" },
    { heading: "POST /api/session", body: "Creates or clears the opaque, Secure, HttpOnly cookie-session adapter after a successful server verification. It must not receive a wallet address." },
    { heading: "POST /api/credentials/witness", body: "Refreshes the signed credential's Merkle witness against the active contract root. It is part of the hosted-login service, not an endpoint a host dApp needs to call directly." },
    { heading: "POST /api/enrollment/challenge and POST /api/enrollment/issue", body: "Create the Freighter signing challenge, check the configured Testnet asset rule, issue the local credential, and publish the updated root through the owner-controlled service flow." },
    { heading: "GET /api/health", body: "Returns 200 only when origin, database URL, contract, gate, asset, and required signing configuration are structurally valid. It returns issue codes only, never configuration values or secrets." },
    { heading: "POST /api/proof/simulate", body: "A clearly non-production compatibility fixture for controlled UI demonstrations. Production requests are rejected and the real verifier never accepts its output." },
  ]},
  examples: { title: "Examples", eyebrow: "Two origins", intro: "App A and App B use the same gate while receiving different private IDs for the same local credential.", sections: [
    { heading: "App A", body: "A holder-only dashboard shows standard wallet login beside VeilPass login and exposes the received payload for comparison." },
    { heading: "App B", body: "A private feedback form runs on a distinct origin and demonstrates origin separation." },
    { heading: "Cookie session adapter", body: "The Next.js example creates a one-time challenge, verifies server-side, stores only an opaque external ID, and sets a Secure, HttpOnly, SameSite=Lax cookie." },
  ]},
};
