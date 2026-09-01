# Contributing to VeilPass

## Branch and author policy

- Never commit directly to `master`.
- Create one scoped branch per concern: `codex/<short-topic>` for this workspace, or `feature/<short-topic>` for human-authored work.
- Configure Git to your own verified name and email before creating commits. Do not use an automation/assistant identity as author or co-author.
- Keep commits small and imperative: one behavior or one coherent maintenance concern per commit.
- Open a pull request, complete its verification checklist, and merge only after CI is green.

## Required checks

Run from `frontend/` before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run contract:test
npm run pack:check
npm run build
```

Run `npm run test:e2e` for UI, API boundary, session, popup, or accessibility changes.

## Security and privacy

- Never commit `.env.local`, Stellar secret keys, npm tokens, database URLs, or wallet addresses obtained during enrollment.
- Keep proof claims accurate. A simulation must remain visibly labelled as simulation.
- Do not add user wallet addresses to host payloads, browser storage, fixtures, screenshots, or logs.
- Report security issues privately to the repository owner instead of opening a public issue with exploit details.

## Package release

- Package version changes require a changelog/release note and `npm run pack:check`.
- Publish only from a protected release workflow using the `irham3` npm/GitHub identity and npm provenance.
- Do not publish from a developer workstation with an unreviewed working tree.
