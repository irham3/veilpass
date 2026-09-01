# @veilpass/sdk

Browser popup client for VeilPass private eligibility login.

## Install

```bash
npm install @veilpass/sdk
```

## Use

```ts
import { VeilPass } from "@veilpass/sdk";

const veilpass = new VeilPass({ loginOrigin: "https://login.veilpass.example" });
const login = await veilpass.login({ gateId: "premium-holder" });
```

The host must expose its own authenticated `POST /api/challenges` and `POST /api/verify` endpoints. A successful result is limited to the scoped private app ID, gate, epoch, origin, and expiry; it never contains a wallet address.

## Security

Use exact HTTPS origins in production. Verify on the host server and create a normal server session only after `login()` resolves. Do not treat a browser result as authorization by itself.
