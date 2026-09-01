# @veilpass/server

Host-server verification primitives for VeilPass eligibility login.

## Install

```bash
npm install @veilpass/server @veilpass/shared
```

## Use

```ts
import { verifyVeilPassProof } from "@veilpass/server";

const result = await verifyVeilPassProof({
  proofResult: body,
  expectedOrigin: "https://app.example",
  expectedGateId: "premium-holder",
  policy,
  store: durableChallengeStore,
  verifyProof: noirVerifier,
  requestId,
});
```

`store.consume()` must atomically consume both the one-time challenge and login nullifier. `verifyProof` must use the pinned production verification key. This package never supplies a database or accepts a simulated proof as a production security boundary.
