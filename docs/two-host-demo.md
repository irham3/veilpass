# Two-host VeilPass demo

This repository includes two actual host surfaces that execute the published SDK flow at distinct browser origins:

- `http://app-a.localhost:3000` — holder dashboard
- `http://app-b.localhost:3000` — private feedback
- `http://login.localhost:3000` — dedicated VeilPass login origin

`*.localhost` resolves to the local loopback interface in modern browsers; no hosts-file edit is required.

## Run locally

Copy the three commented two-host values from [`frontend/.env.example`](../frontend/.env.example) into `frontend/.env.local`, then start the app with a public local bind:

```sh
cd frontend
npm run dev -- --hostname 0.0.0.0
```

Enroll once at the login origin, then open App A and App B in separate tabs. Each host issues and verifies its own challenge through its own origin, while the popup login remains on `login.localhost`. The private app IDs must differ because the origin is part of the derivation.

The configured host list is an explicit comma-separated allowlist. For deployed applications, use exact HTTPS origins and prefer one host origin per host deployment. Never use a wildcard, path, or user-controlled origin value.

## What this proves — and what it does not

The two host sites are real separate browser origins and exercise the SDK's popup/source/origin checks. The current local login proof remains explicitly labelled **Simulated proof**. It is an integration fixture, not a ZK proof. Production rejects that adapter; switch to a verified Noir/Barretenberg artifact only after proving and verifier evidence has been recorded.
