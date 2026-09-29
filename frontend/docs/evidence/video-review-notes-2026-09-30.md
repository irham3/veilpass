# VeilPass technical review video — 30 September 2026

[Play the 1080p review video](veilpass-technical-review-2026-09-30.mp4) (3:06, silent with on-screen explanation).

This video is an **evidence-led technical review**, assembled from fresh captures of the public production pages and the recorded outcomes of a separate live Chrome/Freighter acceptance run. The moving `/demo` segment is the application's **interactive simulation** and is labelled as such. The video does **not** contain the user's raw Freighter approval, proof, wallet address, or live private app IDs. It must not be presented as an uncut live wallet session.

**Untuk presentasi berbahasa Indonesia:** jelaskan batas privasi lebih dulu: issuer melihat alamat saat enrollment, sedangkan host menerima hasil eligibility dan private ID per origin. Setelah itu tunjukkan tiga hasil login (`A1 = A2`, `B1 ≠ A1`), penolakan replay dan expiry, lalu transaksi revoke dan penolakan login baru. Cuplikan bergerak `/demo` adalah simulasi UI; tautan transaksi dan laporan tes di bawah menjadi rujukan hasil live. Video sengaja tanpa suara sintetis; teks di layar adalah penjelasannya dan tabel berikut dapat dipakai sebagai naskah pembicara.

## Scene guide and presenter notes

| Time | What the viewer sees | What to explain |
| --- | --- | --- |
| 0:00–0:11 | VeilPass title and review scope | This is the public Stellar Testnet MVP. The technical result is access without sharing the wallet address with the host dApp. |
| 0:11–0:29 | Landing page and privacy boundary | The issuer sees the wallet address at enrollment. The host gets the eligibility result and an origin-scoped private ID; its verifier temporarily processes proof/public inputs as sensitive data. |
| 0:29–0:49 | Public enrollment page | The separate live run stored a credential after Freighter access and message-signing approval. The [root-update transaction](https://stellar.expert/explorer/testnet/tx/8e02e24c33b97f61b4b36e2c8f77b069c726a6d9df9a433d0c84647bb0dbb221) published the active epoch-1 root. The video shows the page, not the approval popup. |
| 0:49–1:08 | Public App A host and A1/A2 comparison | The live browser run completed two App A logins and compared their private IDs without publishing the values. |
| 1:08–1:23 | Public App B host | The same credential produced a different private ID on App B. Each HTTPS origin maintains its own host session. |
| 1:23–1:35 | Labelled interactive simulation | This is the deterministic `/demo` UI, illustrating login, replay rejection, host switching, and revoke. Its displayed demo identifiers are fixture data. The next scenes report separate live checks. |
| 1:35–1:53 | Replay and expiry outcomes | Replaying an already consumed App A proof returned HTTP 400 `CHALLENGE_SPENT`. An unused expired proof returned HTTP 400 `CREDENTIAL_EXPIRED`; raw proof values are withheld. |
| 1:53–2:13 | Revocation outcome | The on-chain [revoke transaction](https://stellar.expert/explorer/testnet/tx/4b59f5e6cea52484358184c77bbb5904afab9b2c8bb0fed3b9df9b75e056a6bf) was followed by `is_revoked=true`; a fresh App A login returned `CREDENTIAL_REVOKED`. An already issued cookie session can last until its expiry. |
| 2:13–2:32 | Public Quickstart | `@veilpass/sdk` opens the popup. The integrating host supplies same-origin challenge and verify routes, durable replay protection, gate policy, and the server session; `@veilpass/server` provides verification primitives. |
| 2:32–2:49 | Test and deployment evidence | [CI run 36588346328](https://github.com/irham3/veilpass/actions/runs/36588346328) passed both jobs. The [test report](test-report.md) details 489/489 Vitest tests and 100% V8 coverage of the defined first-party JavaScript/TypeScript inventory, with Rust, Noir, and browser checks reported separately. |
| 2:49–3:06 | Review boundary and source links | Use the [live acceptance checklist](live-acceptance-checklist.md) for exact evidence and the [demo guide](demo-end-to-end-guide-2026-09-25.md) for a live presentation. This remains a Testnet MVP without a mainnet security audit. |

## Capture and verification

- Public UI captures were taken from `veilpass.dev`, `login.veilpass.dev`, `app-a.veilpass.dev`, and `app-b.veilpass.dev` on 30 September 2026 in a clean browser context. They contain no holder credential or raw private ID.
- The moving simulation was recorded from the production `/demo` page on the same date. Its fake identifiers are visible only inside the labelled simulation.
- The H.264 MP4 is 1920 × 1080 at 30 fps. `ffprobe` reports a 186.5-second duration; `ffmpeg` decoded the complete file without errors. On-screen titles provide the explanation without a synthetic voiceover.
- SHA-256: `884BEB6F701D66375FD17E75D74DC03F04514EA43907B1DA495EF99D465D29ED`.
- No screenshot or frame in this video proves that the Freighter approval popup was filmed. If a reviewer requires that literal footage, a newly saved live recording with the user's own approval must be reviewed and redacted separately. The prior raw recording could not be located.
