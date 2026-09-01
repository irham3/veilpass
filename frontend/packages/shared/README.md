# @veilpass/shared

Shared, runtime-validated contracts for a VeilPass host integration.

## Install

```bash
npm install @veilpass/shared
```

## Use

```ts
import { normalizeOrigin, verifyResultSchema } from "@veilpass/shared";

const hostOrigin = normalizeOrigin("https://app.example");
const result = verifyResultSchema.parse(serverResponse);
```

This package contains no wallet access, proof generation, or server persistence. It provides the public schemas and exact-origin normalization shared by the browser SDK and host verifier.
