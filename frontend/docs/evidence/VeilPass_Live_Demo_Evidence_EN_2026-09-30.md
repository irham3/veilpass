# Live Demo Video Evidence

## Purpose

This file maps each section of the VeilPass live developer demo video to the browser capture or acceptance record that supports it. The edited sequence is intended for Deliverable 3 review. It joins real browser captures and dated acceptance results; it is not a continuous screen recording.

## Video files

- `VeilPass_Live_Developer_Demo_EN_2026-09-30.mp4` — 121.8 seconds, 1920 × 1080, H.264 video, AAC audio, English narration, and an embedded English caption track.
- `VeilPass_Live_Developer_Demo_EN_2026-09-30.srt` — English sidecar captions for video players and YouTube upload.
- `VeilPass_Developer_Explainer_EN_2026-09-30.mp4` — the 81.6-second narrated developer explainer used as the opening product and SDK section of the final video.

## Evidence map

| Video section | Source and date | What the viewer can verify |
| --- | --- | --- |
| Product model and SDK integration | Narrated developer explainer, 2026-09-30 | Address-based correlation comparison, VeilPass proof flow, browser SDK use, server verification, privacy boundaries, and documentation entry points. |
| Enrollment approval | Chrome browser capture, 2026-09-30 | The holder approved the off-chain enrollment message. A later login screen confirms the credential is available in browser IndexedDB. The wallet account display is masked. |
| App A login challenge | Chrome browser capture, 2026-09-30 | The requested host origin is `https://app-a.veilpass.dev`; a local credential is available for proof generation. |
| App A login and repeat | Chrome browser captures and verified host results, 2026-09-30 | App A accepted the credential on repeated logins and returned the same origin-scoped ID. The ID itself is omitted from the video. |
| App B login | Chrome browser capture and verified host result, 2026-09-30 | `https://app-b.veilpass.dev` accepted the same credential and used a different host-local ID. The ID itself is omitted from the video. |
| Replay rejection | Earlier production acceptance run, 2026-09-30 | A consumed App A proof replay returned HTTP 400 `CHALLENGE_SPENT`. |
| Revocation rejection | Earlier disposable-credential acceptance run, 2026-09-30 | The chain read returned `is_revoked=true`; a fresh App A login returned `CREDENTIAL_REVOKED`. Transaction: `e9f62958c9fca83ed6a45a6f2bd7deb1c1739b6dd4faba97ea87f2b2f0a972e2`. |

## Run separation and privacy

The current App A and App B browser captures use a credential that remains active. Replay and revocation results are presented as a separate earlier acceptance run, not as outcomes from that current credential. The video labels this distinction on screen.

The video masks the holder account display and omits private application IDs, proof payloads, revocation hashes, and signer material. No seed phrase is included. The enrollment signature is an off-chain wallet-control message; it does not transfer funds.

## Supporting acceptance records

- Live acceptance checklist: `live-acceptance-checklist.md`.
- Redacted host request and response evidence: `host-network-capture-redacted-2026-09-29.md`.
- Test and coverage report: `test-report.md`.
- Developer demo guide: `demo-end-to-end-guide-2026-09-25.md`.
- Testnet revocation transaction: https://stellar.expert/explorer/testnet/tx/e9f62958c9fca83ed6a45a6f2bd7deb1c1739b6dd4faba97ea87f2b2f0a972e2.

## YouTube upload

YouTube URL: to be added after upload.

Recommended title: VeilPass Live Demo | Private Login Across Two Apps

Recommended description: See how a developer can integrate VeilPass, enroll a browser-local credential, authenticate on two separate app origins, and verify replay and revocation rejection. This edited walkthrough combines live browser captures with a separately labeled earlier acceptance run. Private IDs and wallet details are hidden.
