# VeilPass — Audit Implementasi dan Rencana Penyelesaian

> **Pembaruan implementasi 1 September 2026:** package npm, enrollment challenge yang durable dan terikat, circuit Noir yang dipin serta diuji melalui `compile → witness → prove → verify` di CI, penolakan simulator pada production, demo SDK dua-host lokal, serta motion landing berbasis GSAP telah diimplementasikan. Bukti deployment Stellar testnet yang baru masih harus dijalankan dengan akun testnet terkontrol sebelum sebuah rilis publik dapat mengklaim status deployment terkini.

**Tanggal audit:** 1 September 2026
**Acuan scope:** Proposal Instawards VeilPass, 2 Agustus 2026
**Status keseluruhan:** **Functional prototype / pre-production** — fondasi produk dan sebagian besar alur sudah ada, tetapi MVP belum memenuhi klaim inti proposal: private login berbasis *zero-knowledge proof* yang berjalan, stabil, domain-bound, dan dapat direview pada dua dApp nyata.

## Ringkasan eksekutif

Repository ini telah melampaui tahap konsep. Sudah tersedia kontrak Soroban, UI Next.js yang ter-deploy, integrasi Freighter untuk enrollment, schema credential, API challenge/session/verifier, SDK popup draft, circuit Noir, test unit/e2e, dokumentasi developer, dan bukti deployment lama.

Namun, jalur login yang sedang digunakan adalah **HMAC “Simulated proof” yang diterbitkan oleh endpoint server**, bukan proof Noir/ZK yang dibuat dan diverifikasi secara kriptografis. Implementasi ini secara eksplisit menyatakannya sebagai forgeable. Karena itu, fitur paling penting dalam proposal—membership proof, jaminan stable private ID, nullifier, dan revocation tanpa mengekspos wallet—belum selesai secara keamanan, walaupun demo UI dapat menunjukkan perilaku tersebut.

Prioritas pertama bukan menambah UI lagi. Prioritasnya adalah mengganti boundary simulasi dengan prover/verifier nyata, membuat lifecycle credential/Merkle/revocation dapat dioperasikan, dan membuktikan integrasi pada dua origin publik yang benar-benar berbeda.

## Cara audit dilakukan

Audit membandingkan proposal dengan source repository, konfigurasi, artefak bukti, deployment HTTP, serta test yang dijalankan ulang pada 1 September 2026.

### Legenda status

| Status | Arti |
| --- | --- |
| **Selesai / terverifikasi** | Ada di source dan berhasil diuji/diobservasi ulang pada audit ini. |
| **Sebagian** | Fondasi ada, tetapi tidak mencakup perilaku atau bukti yang dijanjikan proposal. |
| **Belum** | Tidak ditemukan implementasi operasional untuk scope tersebut. |
| **Tidak tervalidasi** | Diklaim/didokumentasikan, tetapi audit saat ini belum dapat membuktikannya atau menemukan bukti yang cacat. |

### Verifikasi yang dijalankan pada audit ini

| Pemeriksaan | Hasil | Catatan |
| --- | --- | --- |
| Unit/integration test frontend | **Lulus** | 14 file, 52 test lulus. |
| Test kontrak Soroban lokal | **Lulus** | 3 test lulus. |
| ESLint | **Lulus** | Tidak ada error. |
| TypeScript `--noEmit` | **Lulus** | Tidak ada error. |
| Build produksi Next.js | **Lulus** | Build berhasil pada environment lokal. |
| Playwright desktop + mobile | **Flaky** | 23 test lulus; 1 test performance desktop sempat gagal pada 4,85 detik terhadap target <4 detik lalu lulus ketika retry. |
| Endpoint publik `/`, `/demo`, `/dashboard` | **Tersedia** | Ketiganya merespons HTTP 200 pada deployment Vercel. |
| Smoke kontrak Stellar Testnet | **Tidak tervalidasi** | Skrip menampilkan `Address cannot be used to sign ...` untuk dua panggilan, tetapi tetap keluar dengan kode sukses. Hasil ini tidak boleh dianggap smoke test lulus. |
| Freighter enrollment live | **Belum diuji** | Membutuhkan wallet testnet, trustline, aset holder, dan persetujuan pengguna. |
| Noir compile/prove/verify | **Belum diuji** | Toolchain WSL/Nargo/Barretenberg belum terpasang; artefak/verifying key belum ada. |
| PostgreSQL replay/session | **Belum diuji** | Tidak ada `DATABASE_URL` yang dikonfigurasikan untuk integration test. |

## Pemetaan proposal ke kondisi repository

### Deliverable 1 — Private Gate Core

| Item proposal | Status | Bukti yang ada | Gap yang harus ditutup |
| --- | --- | --- | --- |
| Kontrak Soroban: policy hash, credential root, epoch, revocation, event | **Sebagian** | `contracts/veilpass-gate/src/lib.rs` memiliki `create_gate`, `update_root`, `rotate_epoch`, `revoke`, `get_gate`, `is_revoked`, dan event. | Kontrak berfungsi sebagai registry, tetapi belum menjadi sumber lifecycle credential/Merkle. Dokumentasi juga menyebut issuer key tersimpan di kontrak, padahal struct kontrak tidak memilikinya. |
| Satu rule eligibility berbasis aset testnet | **Sebagian** | Enrollment memeriksa asset balance melalui Horizon pada `frontend/lib/stellar/eligibility.ts`. | Belum ada test live wallet/asset dan belum ada rekonsiliasi antara issuer, root, serta credential holder. |
| Credential root / Merkle membership | **Belum operasional** | Circuit Noir mempunyai verifikasi Merkle depth 16. | Tidak ada pembuat leaf/tree/path, penyimpanan path, updater root, atau pipeline yang memasukkan credential issuance ke tree. Credential yang dikeluarkan hanya menyimpan root yang ada saat itu. |
| Domain-bound stable private ID | **Sebagian, tidak aman** | Circuit mendefinisikan formula domain-bound. UI login menghitung hash dari `subjectSecret` dan origin. | Pada jalur aktif, server HMAC menandatangani `privateAppId` yang dikirim client; tidak ada proof yang memaksa nilai tersebut berasal dari subject secret. Stabilitas hanya perilaku UI, belum jaminan kriptografis. |
| One-time challenge nullifier/replay prevention | **Sebagian** | `ChallengeStore` dan adaptor PostgreSQL mengonsumsi challenge/nullifier secara atomik; ada test. | Jalur live dengan DB belum diuji. Nullifier juga belum dibuktikan oleh ZK proof. |
| Expiry dan revocation | **Sebagian** | Verifier memeriksa expiry, epoch, root dan `is_revoked`; registry mendukung revocation hash. | Issuer tidak punya revocation handle yang dapat dipakai untuk mencabut credential individual karena handle diturunkan dari secret pengguna. Demo revoke hanya state lokal. Rotasi root/epoch bisa membatalkan secara kasar, tetapi prosedur operasionalnya belum ada. |
| Unit test valid, separation, replay, expiry, revocation | **Sebagian** | 52 test dan 3 test kontrak lulus; test simulator meliputi banyak error path. | Belum ada test resmi proof nyata, Merkle membership nyata, fixture valid/invalid Noir, atau testnet E2E yang berhasil. |

### Deliverable 2 — SDK dan Hosted Login

| Item proposal | Status | Bukti yang ada | Gap yang harus ditutup |
| --- | --- | --- | --- |
| TypeScript SDK | **Sebagian** | `frontend/packages/sdk/src/` memiliki popup channel, state binding, dan typed result. | Masih `private`, versi `0.0.0-pre.1`, tanpa build/publish pipeline, changelog, package artifact, atau integration app luar repository. |
| Hosted sign-in popup | **Sebagian** | `/login` dan SDK `window.open()` tersedia; origin/source/state divalidasi. | Jalur aktif memanggil endpoint `/api/proof/simulate`; belum menjalankan prover lokal nyata. Belum diuji terhadap login origin terpisah dalam deployment publik. |
| Freighter enrollment | **Sebagian** | UI meminta akses Freighter, memaksa Testnet, meminta signature, lalu menyimpan credential di IndexedDB. | Challenge enrollment disimpan in-memory bahkan pada production; database tables untuk enrollment/credentials belum dipakai. Tidak ada test browser wallet sungguhan. |
| Fresh server challenge & replay protection | **Sebagian** | Challenge 32-byte disimpan sebagai digest, TTL 5 menit, verifier fail-closed di production tanpa `DATABASE_URL`. | Tidak ada bukti PostgreSQL live. Enrollment challenge tidak durable/fail-closed. |
| Local proof generation | **Belum** | Subject secret tersimpan lokal; source circuit ada. | Browser mengirim data ke `/api/proof/simulate`, lalu server membuat HMAC. `UnavailableNoirAdapter` menyatakan artifact Noir belum dibangun. |
| Verifier endpoint dan cookie session | **Sebagian** | `/api/verify` meminimalkan respons; cookie HttpOnly dan session store tersedia. | Jaminan verifier bergantung pada simulated HMAC; DB session belum diuji. Session belum dipisahkan per host app untuk deployment dua dApp nyata. |
| SDK tidak mengembalikan wallet ke host | **Selesai untuk jalur teruji** | Schema success dibatasi pada `privateAppId`, gate, epoch, origin, expiry; test memeriksa wallet tidak muncul di UI/storage/cookie/API bodies pada demo. | Perlu network capture pada dua dApp live setelah prover nyata tersedia. |

### Deliverable 3 — Dua dApp, dokumentasi, dan evidence

| Item proposal | Status | Bukti yang ada | Gap yang harus ditutup |
| --- | --- | --- | --- |
| Demo publik testnet | **Sebagian** | Deployment Vercel merespons HTTP 200; `/dashboard` membaca state bila env tersedia. | Live contract smoke saat ini tidak valid; live holder enrollment belum dibuktikan. |
| App A dan App B pada dua domain | **Belum** | Halaman `/demo` memperlihatkan App A/App B. | Keduanya adalah state machine dalam **satu halaman dan satu origin**, dengan private ID/origin hard-coded. Ini bukan dua host dApp/deployment berbeda seperti proposal. |
| Same ID di App A, different ID di App B | **Sebagian, simulasi** | Demo dan E2E menguji string ID hard-coded berbeda. | Perlu browser test terhadap dua URL/origin nyata, memakai credential sama dan proof nyata. |
| Replay, expiry, revocation demo | **Sebagian, simulasi** | UI/demo menunjukkan `CHALLENGE_SPENT` dan `CREDENTIAL_REVOKED`. | Revocation demo adalah state lokal; expiry belum menjadi skenario E2E publik nyata. |
| Gate dashboard | **Sebagian** | Dashboard menampilkan configuration/read RPC dan action UI. | Action UI hanya mensimulasikan transaksi; perlu jalur sign-and-send, status transaksi, dan operator runbook yang benar. |
| Quickstart, API, privacy boundary, threat model | **Sebagian** | Halaman docs, README, dan evidence tersedia. | Beberapa dokumen menyatakan kemampuan yang belum ada (misalnya issuer keys di contract; contoh App A/App B). Harus direvisi agar tidak overclaim sampai implementasi selesai. |
| Test report, transaction links, network evidence, video review | **Sebagian / tidak tervalidasi** | Test report lama, transaction hash, screenshot desktop, claim audit ada. | Smoke report lama konflik dengan run audit sekarang. Belum ada network capture dari dua dApp live, video review, atau reproducible evidence bundle bertanggal. |

## Temuan prioritas

### P0 — Pemblokir claim MVP/proposal

1. **Ganti simulated HMAC dengan proof Noir yang nyata.** Endpoint aktif membuat proof HMAC di server; prover Noir belum tersedia dan `UnavailableNoirAdapter` selalu gagal. Selama ini belum selesai, VeilPass tidak boleh diklaim sebagai ZK login.
2. **Implementasikan lifecycle Merkle credential.** Issuance harus menghasilkan leaf dan revocation handle yang terkelola, memasukkan leaf ke tree, mempublikasikan root ke kontrak, dan memberi witness/path yang cocok ke wallet tanpa mengungkap wallet kepada host.
3. **Buat stable private ID dan nullifier menjadi enforced oleh circuit.** Nilai tidak boleh berasal dari arbitrary request payload. Server hanya menerima public input dan proof, memverifikasi key yang dipin, lalu mengonsumsi challenge/nullifier.
4. **Rancang revocation yang dapat dijalankan.** Issuer/operator perlu handle yang dapat dipakai untuk membatalkan satu credential tanpa mengetahui subject secret; definisikan apakah revocation list, epoch rotation, atau keduanya.
5. **Bangun App A dan App B sebagai dua deployment origin nyata.** Keduanya harus memakai SDK/verifier dalam kondisi host yang benar, bukan string yang di-hard-code pada satu halaman demo.

### P1 — Penting sebelum reviewer/pilot menganggapnya siap

1. Perbaiki `smoke-testnet.ps1` agar read-only call tidak membutuhkan signer yang tidak tersedia, dan agar stderr/non-zero CLI menjadi non-zero exit code. Catat ledger, timestamp, contract ID, tx hash, output, dan checksum Wasm.
2. Tambahkan environment PostgreSQL nyata serta test migrasi, atomic challenge consume, nullifier collision, session persistence, expiry, dan restart service.
3. Pindahkan enrollment challenge dan credential issuance metadata dari in-memory store ke storage durable; fail closed pada production bila storage tidak siap.
4. Lengkapi package SDK/server: build output, `exports` production, semantic versioning, publish/internal registry decision, API contract tests, dan sample app eksternal.
5. Implementasikan admin write flow: sign-and-send, konfirmasi ledger, event/transaction link, authorization test, serta runbook untuk root/epoch/revocation.
6. Stabilkan test performa: ukur cold/warm navigation, hilangkan flake <4 s atau ubah budget menjadi metrik terukur yang realistis.

### P2 — Kualitas review dan operasional

1. Revisi docs yang overclaim supaya sesuai code hingga P0 selesai.
2. Tambahkan observability aman: request ID, public error, gate, origin, latency, tanpa wallet/proof/nullifier/raw challenge.
3. Buat evidence bundle terulang di CI: report, coverage, artefak circuit, contract query, capture jaringan, screenshot, dan video script.
4. Tambahkan security review mandiri: origin normalization, popup opener lifecycle, CSP, rate limiting, DoS limits, key rotation, data retention, dan abuse cases.

## Rencana penyelesaian

Estimasi berikut adalah **rencana kelanjutan**, bukan klaim bahwa semuanya dapat ditambah tanpa desain ulang. P0 perlu diputuskan dan diselesaikan sebelum menganggap milestone proposal selesai.

### Milestone 0 — Kunci keputusan desain (2–3 hari)

**Tujuan:** memastikan desain proof, issuer, revocation, dan hosting tidak saling bertentangan.

- Tetapkan toolchain Noir/Barretenberg yang dipin dan reproducible (Docker/WSL/CI Linux).
- Tetapkan format leaf: commitment, gate ID, epoch, credential expiry, leaf nonce, serta revocation handle.
- Tetapkan ownership dan penyimpanan witness/Merkle path: encrypted/local wallet storage versus issuer retrieval.
- Tetapkan model revocation: per-credential on-chain/public accumulator, root replacement, epoch rotation, serta dampaknya pada credential aktif.
- Putuskan topologi final: `login.veilpass…`, `app-a…`, dan `app-b…`; daftar exact allowed origins; serta apakah host verifier dijalankan per-host atau sebagai service.
- Perbarui threat model dan privacy boundary dari keputusan tersebut.

**Definition of done:** ADR/design spec disetujui; public inputs dan private witness circuit tidak ambigu; semua claim produk dipetakan ke mekanisme yang benar-benar ada.

### Milestone 1 — Prover dan verifier ZK nyata (5–8 hari)

**Tujuan:** proof valid dapat dibuat dari credential nyata dan diverifikasi tanpa memercayai input identitas dari client.

- Instal/pin Nargo dan backend Barretenberg di CI; compile circuit dari source.
- Buat test fixture valid dan invalid untuk domain, root, expiry, epoch, challenge, nullifier, dan revocation.
- Hasilkan serta version-control/host artefak circuit, proving key, verification key, versi circuit, dan hash artefaknya.
- Implementasikan `NoirProofAdapter` browser worker: input minimum, progress/error handling, resource limits, dan tidak mengirim subject secret ke server.
- Implementasikan verifier server yang memverifikasi proof nyata dan menghapus acceptance path HMAC dari production.
- Jadikan simulator hanya fixture development dengan feature flag yang tidak dapat aktif di environment review/production.

**Definition of done:** satu test integration membuat proof nyata lokal, verifier menerimanya; perubahan satu public input/witness membuat verifier menolak; result host tetap tidak mengandung wallet address.

### Milestone 2 — Credential, Merkle, dan revocation lifecycle (5–7 hari)

**Tujuan:** credential yang diterbitkan benar-benar menjadi membership proof yang dapat dicabut.

- Implementasikan `CredentialRegistry`/Merkle service: add leaf, generate/update root, persist tree/frontier, generate witness, audit event.
- Tulis credential issuance transactionally: validasi Freighter signature dan asset eligibility, buat commitment/leaf/revocation handle, update tree, submit/update root contract, lalu return credential + witness yang dibutuhkan client.
- Tambahkan durable tables/repository untuk enrollment challenge, issuer credential, Merkle state, credential status, dan contract-sync cursor; hapus fallback in-memory pada production.
- Implementasikan prosedur revoke dan epoch/root rotate yang menjaga konsistensi off-chain/on-chain.
- Tambahkan recovery/error behavior apabila contract update gagal setelah issuance dimulai.

**Definition of done:** issuer dapat menerbitkan credential ke test wallet eligible, client menghasilkan membership proof, revoke individual membuat login ditolak, dan root/epoch changes memberi hasil yang terdokumentasi.

### Milestone 3 — Hosted login dan dua dApp nyata (4–6 hari)

**Tujuan:** membuktikan claim produk pada kondisi host yang sama seperti proposal.

- Deploy login issuer/verifier ke `login` origin HTTPS yang terpisah.
- Buat App A dan App B sebagai aplikasi/deployment terpisah dengan exact origin berbeda; gunakan SDK package hasil build, bukan import workspace internal.
- Masing-masing host membuat/menyimpan challenge pada boundary server yang tepat dan membuat normal opaque cookie session setelah verifier sukses.
- Uji: wallet yang sama → ID stabil di App A; ID berbeda di App B; replay; expiry; revocation; wrong origin; popup/state mismatch.
- Lakukan network capture pada kedua host dan audit storage/log/cookie untuk membuktikan wallet tidak diterima host.

**Definition of done:** reviewer dapat membuka dua URL publik, mengulangi alur tanpa data fixture/hard-code, serta melihat hasil/rejection yang bersumber dari verifier nyata.

### Milestone 4 — Hardening, evidence, dan review release (3–5 hari)

**Tujuan:** menjadikan implementasi dapat diperiksa ulang oleh reviewer non-teknis dan developer.

- Perbaiki smoke script Testnet dan jalankan query/deploy evidence tanpa false positive.
- Tambahkan PostgreSQL integration tests dan E2E Freighter manual checklist; jalankan full test matrix pada CI.
- Selesaikan operational dashboard: transaction submit/status, contract event links, root/revocation controls, role/runbook.
- Revisi quickstart/API/contract docs sesuai produk final; publikasikan version SDK dan sample integration.
- Buat test report bertanggal, evidence matrix, transaction links, network capture redacted, screenshots, serta video review 3–5 menit.
- Jalankan security/claim review akhir dan pastikan UI/docs tidak lagi menyebut simulation sebagai fitur produk final.

**Definition of done:** seluruh checklist evidence proposal dapat diberi status “present” dengan link yang dapat direproduksi; tidak ada item P0/P1 terbuka.

## Urutan kerja yang disarankan

```text
Milestone 0: keputusan desain
        ↓
Milestone 1: Noir prove + verify nyata
        ↓
Milestone 2: credential/Merkle/revocation lifecycle
        ↓
Milestone 3: App A + App B pada origin nyata
        ↓
Milestone 4: testnet evidence, docs, video, release review
```

Jangan memulai demo/video final sebelum Milestone 1–3 selesai. Jika bukti dibuat lebih awal, statusnya harus ditulis sebagai **prototype simulation**, bukan private ZK login yang memenuhi proposal.

## Backlog implementasi langsung

| Prioritas | Pekerjaan | Ketergantungan | Acceptance criteria |
| --- | --- | --- | --- |
| P0 | CI Linux/WSL untuk Noir + Barretenberg | Milestone 0 | `nargo test`, compile, prove, verify berjalan dari command terdokumentasi. |
| P0 | `NoirProofAdapter` dan verifier nyata | Artefak circuit | Tidak ada jalur HMAC simulator di production; tampering ditolak. |
| P0 | Merkle registry/witness generator | Format credential | Leaf issued masuk root; witness valid menghasilkan proof. |
| P0 | Revocation handle + operator flow | Design revocation | Revoke individual menolak proof tanpa mengungkap wallet ke host. |
| P0 | App A/App B separate origins | SDK build + hosted login | ID same/different dibuktikan E2E pada URL berbeda. |
| P1 | Perbaiki smoke script Testnet | Tidak ada | CLI failure menghasilkan exit code gagal; bukti read contract terbaru tersimpan. |
| P1 | PostgreSQL repositories dan tests | Database service | Tidak ada in-memory enrollment/replay/session pada production. |
| P1 | SDK release pipeline | Final API | Package dapat di-install oleh sample host di luar monorepo. |
| P1 | Contract admin submit + runbook | Wallet operator | Root/revoke transaction benar-benar dikirim dan event/link tercatat. |
| P2 | Stabilkan navigation performance test | Baseline metrik | Test tidak flaky dan target tercapai secara konsisten. |
| P2 | Revisi docs/evidence/video | Semua milestone | Tidak ada claim yang melebihi implementasi atau evidence. |

## Risiko dan keputusan yang diperlukan

| Risiko | Dampak | Mitigasi/keputusan |
| --- | --- | --- |
| Proving time/ukuran artefak browser terlalu berat | Popup UX dan deployment terhambat | Benchmark circuit sejak Milestone 1; bila perlu gunakan prover service hanya jika privacy model direvisi dan disetujui. |
| Issuer tidak dapat revoke karena tidak tahu subject secret | Revocation proposal tidak dapat dipenuhi | Desain revocation handle pada issuance, bukan derivasi yang hanya diketahui user. |
| Root update on-chain dan DB issuance tidak atomik lintas sistem | Credential dapat orphan/stale | Gunakan workflow pending/confirmed, idempotency, outbox/event sync, dan recovery job. |
| Dua host memiliki storage/CSRF/session berbeda | Demo tampak berhasil tetapi integrasi nyata gagal | Test app mandiri sejak Milestone 3, bukan setelah UI final. |
| Testnet signer/config tidak tersedia | Evidence contract tidak valid | Gunakan identity testnet eksplisit/read-only invocation yang tidak require auth, secret disimpan di secret manager. |

## Status yang dapat dikomunikasikan saat ini

Pernyataan yang aman saat ini:

> VeilPass memiliki prototype Stellar Testnet untuk enrollment berbasis Freighter, gate registry Soroban, popup login, server-side challenge handling, dan host response yang diminimalkan. Interface demo memperlihatkan private ID per origin serta penolakan replay/revocation. Circuit Noir dan desain data tersedia, tetapi jalur aktif masih memakai simulated proof yang bukan zero knowledge; karena itu final ZK login, lifecycle Merkle/revocation, dan dua dApp multi-origin nyata masih dalam pengerjaan.

Pernyataan yang **belum** aman sampai rencana P0 selesai:

- “VeilPass sudah memakai zero-knowledge proof.”
- “Private app ID stabil dan domain-bound secara kriptografis.”
- “Revocation individual sudah berjalan end-to-end.”
- “Dua dApp berbeda telah login secara nyata tanpa menerima wallet address.”
- “Smoke test kontrak testnet terbaru lulus.”

## Catatan repository

Folder root `docs/` saat audit ini di-ignore oleh perubahan lokal pada `.gitignore`. File rencana ini tetap dibuat di sana sesuai permintaan, tetapi perlu dipastikan perubahan ignore tersebut memang diinginkan sebelum dokumen akan dikomit ke repository.
