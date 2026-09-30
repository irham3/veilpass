# Published VeilPass npm consumer verification

Date: 2026-09-30
Registry source: public npm registry
Versions: `@veilpass/sdk@0.2.2`, `@veilpass/shared@0.2.2`, `@veilpass/server@0.2.2`

## Commands executed in a clean temporary consumer project

```powershell
npm init -y
npm pkg set type=module
npm install @veilpass/sdk@0.2.2 @veilpass/shared@0.2.2 @veilpass/server@0.2.2
node -e "Promise.all([import('@veilpass/sdk'),import('@veilpass/shared'),import('@veilpass/server')]).then(([sdk,shared,server])=>{ console.log('SDK exports:',Object.keys(sdk).sort().join(', ')); console.log('Shared exports:',Object.keys(shared).length); console.log('Server exports:',Object.keys(server).sort().join(', ')); })"
npm ls --depth=0
```

## Result

- Install completed successfully: 4 packages added.
- npm audit reported 0 vulnerabilities.
- Public entry imports succeeded. SDK exports: `VeilPass`, `VeilPassError`; shared package exposes 19 exports; server package exports `verifyVeilPassProof`.
- `npm ls --depth=0` resolved all three packages at `0.2.2`.

## Scope

This verifies package availability, module loading, and the registry version in a clean consumer folder. It does not provision a host database, API routes, durable replay protection, gate policy reader, production verifier, or application session. Those host-owned responsibilities are described in the [two-origin example](../../examples/two-origin-dapp/README.md).
