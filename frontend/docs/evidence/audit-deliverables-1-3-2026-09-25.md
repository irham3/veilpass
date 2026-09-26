# Audit implementasi VeilPass: Deliverable 1–3

> **Catatan lanjutan 26 September 2026:** ini adalah temuan awal sebelum perbaikan pada checkout sekarang. Hambatan CSP inisialisasi WASM, kontrak ID Testnet, status transaksi gate, tampilan owner, log verifier, alur enrollment, dan login lintas-origin telah ditindaklanjuti. Enrollment dan tiga login live berhasil; public npm masih `0.2.0`, sedangkan README/paket `0.2.1` disiapkan lokal untuk release workflow terlindungi. Full-inventory TypeScript coverage bukan 100%. Lihat [delivery status](delivery-status.md), [test report](test-report.md), dan [panduan demo](demo-end-to-end-guide-2026-09-25.md) untuk bukti terbaru dan acceptance yang masih belum diuji (replay, expiry, revocation, host capture tersensor, video, provenance-aligned release, serta coverage branches/lines yang tersisa).

**Tanggal audit:** 25 September 2026  
**Acuan:** Statement of Work (SOW) yang dilampirkan pengguna, khusus bagian 4.1, 5.1, dan 6.1.  
**Objek:** checkout lokal pada branch `master`, termasuk perubahan lokal yang sudah ada saat audit. Audit ini tidak mengubah implementasi.  
**Arti status:** *terimplementasi* berarti kode ada dan jalur terkait diuji; *parsial* berarti sebagian kriteria atau bukti penerimaan belum terbukti; *belum* berarti artefak/kriteria tidak ditemukan. Keberadaan UI simulasi tidak dihitung sebagai keberhasilan proof dan transaksi Testnet nyata.

## Kesimpulan

| Deliverable | Status audit | Ringkasan |
| --- | --- | --- |
| 1 — Private Gate Core | **Parsial, inti teknis kuat** | Kontrak Testnet, circuit, asset rule, dan pengujian komponen tersedia. Kontrak dapat dibaca dari Testnet dan root sekarang tidak kosong. Bukti satu rangkaian login nyata dengan proof, replay, expiry, revocation, dan transaksi root/revoke yang dapat ditinjau belum ditemukan. |
| 2 — SDK and Hosted Login | **Parsial** | Paket SDK/server tersedia di npm, popup, Freighter enrollment, challenge, local proof, verifier, dan cookie session ada. Belum ada bukti end-to-end dari persetujuan Freighter milik pengguna sampai session nyata pada App A/B dan capture jaringan yang diminta SOW. Dokumentasi batas data yang diterima host juga terlalu luas. |
| 3 — Two-dApp Demo and Docs | **Parsial** | App A/B publik, dashboard, quickstart, API, privacy, threat model, dan test report tersedia. Demo reviewer pada `/demo` memakai state dan ID tetap; tidak membuktikan alur live. Belum ditemukan video review, redacted network capture, dan rekaman lengkap replay/expiry/revocation pada Testnet. |

**Putusan keseluruhan: deliverable 1–3 belum dapat dinyatakan selesai penuh sesuai SOW.** Sebagian besar komponen kode telah dibuat; kekurangan utamanya adalah bukti penerimaan end-to-end dan beberapa ketidaktepatan dokumentasi/tes.

## Metode dan batas pemeriksaan

- Membaca SOW, kontrak Rust, circuit Noir, SDK, API, penyimpanan, demo, dokumentasi, dan test. Berkas utama disebut pada tabel di bawah.
- Menjalankan Vitest coverage, test kontrak, `proof:check`, lint, typecheck, build, Playwright, Testnet smoke, dan pemeriksaan HTTP publik. Hasil tepatnya ada pada bagian *Hasil test*.
- Tidak menandatangani pesan dengan Freighter atau mengirim transaksi revocation. Pemeriksaan HTTP publik hanya membuat challenge uji dan membaca health/state; challenge tersebut tidak dipakai login.
- Status live didasarkan pada hasil yang dapat direproduksi saat audit dan artefak yang ditemukan dalam repository. Root on-chain yang tidak kosong **tidak cukup** untuk menyimpulkan wallet enrollment dan seluruh login matrix sudah lulus.

## Deliverable 1 — Private Gate Core

| Kriteria SOW | Bukti kode dan pemeriksaan | Status / yang kurang |
| --- | --- | --- |
| Kontrak Soroban Testnet: policy hash, credential root, epoch, revocation, events | `contracts/veilpass-gate/src/lib.rs` menyediakan `create_gate`, `update_root`, `rotate_epoch`, `revoke`, `get_gate`, `is_revoked` dan empat event. `npm run contract:test` lulus 3/3. `npm run contract:smoke` membaca gate `premium-holder` epoch 1 dari Testnet. | **Terimplementasi.** Test owner tidak sah, stale epoch, gate duplikat, dan TTL ada di `src/test.rs`. |
| Satu asset-based eligibility rule | `frontend/lib/stellar/eligibility.ts`, `/api/enrollment/eligibility`, dan `/api/enrollment/challenge` memeriksa saldo Horizon Testnet. Aturan default adalah native XLM minimum; credit asset juga didukung konfigurasi. | **Terimplementasi pada enrollment.** Bukti balance dan approval wallet dalam alur live final belum ditemukan. |
| Circuit membership domain-bound, private ID stabil, one-time challenge nullifier | `frontend/packages/proof/circuits/membership/src/main.nr` mengikat secret, commitment, path Merkle, gate, epoch, origin, challenge, waktu, private ID, nullifier, dan revocation hash. `proof:check` lulus dua test circuit, witness, UltraHonk prove dan verify. `frontend/packages/proof/src/noir.ts` membangun proof di browser. | **Terimplementasi pada komponen.** Test circuit lintas origin hanya membandingkan dua hash, belum membuat dua proof riil untuk alur App A/B. |
| Penolakan replay, expiry, revocation dan unauthorized updates | `frontend/packages/server/src/verifier.ts`, challenge store, contract test, dan test verifier menutup cabang logika ini. | **Parsial untuk penerimaan SOW.** Belum ada satu rekaman real-proof + durable challenge store + gate Testnet yang memperlihatkan seluruh kasus. Browser reviewer test pada `frontend/tests/e2e/product.spec.ts` memakai `frontend/lib/demo/machine.ts` dengan ID dan error tetap. |
| Bukti publik: contract ID, tx, test report | `frontend/docs/evidence/contract.md` berisi contract ID dan transaksi deploy/initialization. Smoke Testnet saat audit mengembalikan root `273348dff2a3aea95053c4db8579ddacf1051b6d59d07516abb566e75ab4c9d2`; test report ada. | **Parsial.** Dokumen `contract.md`, `delivery-status.md`, dan bagian lama `test-report.md` masih menulis root kosong atau root lama. Link transaksi yang menjelaskan root saat ini dan revoke credential nyata belum ditemukan. |

## Deliverable 2 — SDK and Hosted Login

| Kriteria SOW | Bukti kode dan pemeriksaan | Status / yang kurang |
| --- | --- | --- |
| TypeScript SDK dan hosted popup | `frontend/packages/sdk/src/index.ts` membuka popup; `channel.ts` memeriksa origin, source, state, dan schema; `frontend/components/login/login-surface.tsx` menerima challenge lalu mengirim proof. Paket `@veilpass/sdk`, `@veilpass/server`, dan `@veilpass/shared` versi `0.1.0` terdaftar di npm saat audit. | **Terimplementasi.** |
| Freighter enrollment dan satu asset rule | `frontend/components/enrollment/enrollment-flow.tsx` meminta akses alamat publik dan signature; route enrollment membuat challenge, memeriksa saldo, mengeluarkan credential, dan memublikasikan root. | **Parsial untuk demonstrasi.** Repository tidak menyertakan bukti approval Freighter dan penerbitan credential live yang dapat ditautkan ke transaksi root saat ini. |
| Fresh server challenge dan anti-replay durable | `/api/challenges`, `frontend/lib/server/postgres-challenge-store.ts`, dan verifier memakai challenge acak, expiry, konsumsi atomik, serta nullifier unik. | **Terimplementasi pada kode.** Test PostgreSQL terhadap restart/concurrency dan replay proof riil pada deployment publik belum ditemukan. |
| Local proof dan verifier endpoint | `frontend/packages/proof/src/noir.ts` menghasilkan proof secara lokal; `/api/verify` memanggil `verifyNoirMembershipProof` dengan verification key terpin. Simulator dipisahkan. | **Terimplementasi pada komponen.** Test proof riil di `zk-verifier.test.ts` membuktikan valid dan origin yang diubah gagal; matriks penolakan lengkap masih memakai callback/verifier fixture atau simulasi. |
| Cookie session example | `/api/verify` membuat cookie `vp_session` yang HttpOnly dan Secure dalam production; `/api/session` membaca session. | **Terimplementasi.** Dokumentasi `README.md` dan `frontend/lib/docs/content.ts` menyebut `POST /api/session` untuk membuat/menghapus sesi, sedangkan route yang ada hanya mengekspor `GET`; sesi dibuat oleh `POST /api/verify`. Perbaiki referensi ini. |
| SDK result: eligibility, gate, epoch, expiry, private app ID; tanpa wallet address | `VerifiedLogin` memuat `ok`, `privateAppId`, `gateId`, `epoch`, `origin`, `expiresAt`; tidak ada `walletAddress`. | **Parsial terhadap teks SOW.** Verdict `eligibility` eksplisit tidak ada sebagai field terpisah; `ok: true` merupakan implikasi lolos gate. Dokumentasikan pemetaan tersebut atau tambahkan field jika kontrak SDK harus mengikuti SOW secara literal. |
| Batas privasi host dan network capture | Response sukses yang diterima kode aplikasi minim dan tidak memuat alamat wallet. Namun popup mengirim `ProofResult` ke window host, lalu SDK mengirimkannya ke `/api/verify` pada origin host. Schema public inputs memuat `credentialCommitment`, `loginNullifier`, `revocationHash`, serta raw `proof`. | **Klaim wallet-address tetap didukung oleh schema, tetapi klaim lebih luas di docs salah.** `frontend/lib/docs/content.ts` menyatakan host tidak menerima proof/nullifier/revocation handle/commitment. Host browser dan backend menerima data itu sebagai input verifikasi. Hapus klaim tersebut atau ubah arsitektur. Redacted capture HTTP nyata dari kedua host juga belum ditemukan. |

## Deliverable 3 — Two-dApp Demo and Docs

| Kriteria SOW | Bukti kode dan pemeriksaan | Status / yang kurang |
| --- | --- | --- |
| Dua dApp pada origin publik berbeda | `https://app-a.veilpass.dev` dan `https://app-b.veilpass.dev` tersedia. Saat audit health `login.veilpass.dev` mengembalikan `ok: true`; kedua endpoint challenge mengembalikan origin masing-masing dan challenge berbeda; origin tak dipercaya ditolak HTTP 403. | **Terimplementasi untuk routing/challenge.** Ini belum membuktikan login wallet/proof nyata. |
| Repeat login, cross-domain comparison, replay, expiry, revocation | `frontend/components/demo/demo-bench.tsx` dan `frontend/lib/demo/machine.ts` menampilkan App A/B, ID tetap, replay, dan revocation simulasi. `frontend/components/demo/host-demo.tsx` menyediakan tombol login live. | **Parsial.** Demo bench bukan chain-backed; tidak ada kontrol expiry pada bench. Tidak ada evidence paket lengkap: login App A dua kali, App B sekali, proof replay, expiry, lalu revoke credential nyata pada Testnet dan login gagal. |
| Gate dashboard | `frontend/app/dashboard` dan `frontend/components/dashboard/contract-actions.tsx` menyediakan aksi gate. | **Terimplementasi di UI/kode.** Perlu capture aksi live/root/revocation untuk verifikasi reviewer. |
| Quickstart, API reference, privacy boundary, threat model, test report | `frontend/lib/docs/content.ts` dan `frontend/docs/evidence/test-report.md` tersedia. | **Terimplementasi secara struktur, perlu koreksi isi.** Lihat mismatch `POST /api/session`, klaim host input, root dan hitungan test yang kedaluwarsa. |
| Public acceptance check | `npm run production:acceptance` berhenti dengan `App A navigation is missing https://veilpass.dev/demo`. Halaman App A HTTP 200 memuat tautan `https://veilpass.dev/#two-app-demo`, bukan `/demo`. Pemeriksaan manual sesudahnya berhasil untuk health, dua challenge, dan hostile-origin 403. | **Checker gagal karena ekspektasi tautan tidak sinkron dengan halaman live.** Selaraskan checker dengan navigasi yang memang dituju, lalu jalankan ulang. Jangan laporkan script ini sebagai lulus pada versi saat ini. |
| Review video dan evidence bundle | Pencarian file ter-track pada `frontend/docs`, `docs`, dan `frontend/public` tidak menemukan `.mp4`, `.webm`, `.har`, atau redacted network capture. | **Belum terbukti/tersedia di repository.** SOW secara eksplisit meminta video singkat dan capture jaringan host tanpa alamat wallet. |

## Hasil test dan coverage saat audit

| Pemeriksaan | Perintah / sumber | Hasil 25 September 2026 |
| --- | --- | --- |
| Unit, component, integration, security + coverage | `npm run test:coverage` | **Lulus:** 37 file, 161/161 test. V8: statement **100% (546/546)**, branch **100% (403/403)**, function **100% (120/120)**, line **100% (432/432)**. Laporan di `frontend/coverage/coverage-final.json`, HTML dan LCOV. |
| Kontrak Rust | `npm run contract:test` | **Lulus:** 3/3 unit test. Tidak ada persentase line/branch coverage Rust yang dihasilkan oleh perintah ini. |
| Noir circuit/proof | `npm run proof:check` | **Lulus:** 2/2 circuit test; witness dibuat, proof UltraHonk dibuat dan diverifikasi. Tidak ada persentase coverage circuit. |
| Testnet contract smoke | `npm run contract:smoke` | **Lulus:** baca gate epoch 1, root non-kosong `273348…4c9d2`, fixture `is_revoked=false`. Ini read-only, bukan uji transaksi revoke. |
| Lint | `npm run lint` | **Lulus.** |
| TypeScript | `npm run typecheck` setelah build selesai | **Lulus.** Eksekusi awal yang bersamaan dengan build sempat gagal membaca `.next/types/routes.js` yang sedang dihasilkan; hasil berurutan adalah hasil audit yang dipakai. |
| Production build | `npm run build` | **Lulus.** |
| Browser/system | `npm run test:e2e` dengan server hasil build dan allowlist origin sesuai `playwright.config.ts` | **Lulus: 40/40 skenario** pada desktop Chromium dan emulasi Pixel 7. Percobaan pertama berhenti sebelum test karena build + startup melewati 120 detik. Percobaan kedua memakai server manual dengan allowlist `.env.local` yang tidak memuat `app-a.localhost`, sehingga 38/40 lulus dan dua popup gagal menerima challenge 201. Setelah allowlist disamakan dengan konfigurasi Playwright, satu run lengkap lulus 40/40. |
| Public acceptance | `npm run production:acceptance` | **Gagal** pada tautan `/demo` App A. Health, challenge dua origin, dan hostile-origin 403 lulus dalam pemeriksaan manual terpisah. |

### Makna angka 100% coverage

Angka 100% adalah **coverage dari 34 file yang dipilih konfigurasi Vitest**, bukan seluruh repository. Konfigurasi di `frontend/vitest.config.mts` hanya memasukkan `lib/**/*.ts`, sebagian package TS, `packages/proof/src/mode.ts`, dan komponen marketing; kemudian mengecualikan jalur penting seperti `lib/server/postgres-*.ts`, `enrollment-store.ts`, `root-publisher.ts`, `verifier-gate.ts`, `zk-verifier.ts`, dan `demo-asset-issuer.ts`. Route `app/api/**`, popup/login/enrollment UI, implementasi proof `packages/proof/src/noir.ts`, kontrak Rust, dan circuit Noir juga tidak masuk denominator coverage V8. Beberapa cabang operasional dalam file yang masuk diberi `c8 ignore`. Karena itu, **100% tidak boleh dilaporkan sebagai total project coverage atau bukti lengkap kriteria SOW**.

Test browser pada `frontend/tests/e2e/product.spec.ts` mengecek perilaku UI, route, header, dan simulasi reviewer. Test tersebut tidak membuktikan satu wallet Freighter nyata menghasilkan proof di App A/B lalu ditolak sesudah replay/expiry/revoke. Test privasi memakai marker wallet sintetis dan response lokal; capture jaringan pada alur live tetap diperlukan.

## Pekerjaan yang masih diperlukan agar SOW dapat dinyatakan selesai

1. **P0 — Rekam acceptance live dengan wallet pengguna.** Jalankan Freighter Testnet enrollment, simpan transaction link update-root yang sesuai dengan root aktif, login App A dua kali dan App B sekali, lalu catat ID serta cookie session yang benar-benar diterbitkan. Persetujuan wallet harus dilakukan pemilik wallet sendiri.
2. **P0 — Jalankan matriks penolakan live.** Replay proof/challenge yang pernah dipakai, tunggu challenge/proof expiry, lakukan revocation on-chain terhadap credential uji, dan tunjukkan error aman pada login baru. Simpan transaction link revocation dan hasil request yang disamarkan.
3. **P0 — Buat evidence yang diminta SOW.** Redacted network capture untuk kedua host yang membuktikan tidak ada alamat Stellar pada request/response host, screenshot hasil tiap langkah, dan video review singkat. Pisahkan jelas traffic enrollment (issuer boleh melihat alamat) dari traffic host.
4. **P1 — Koreksi batas privasi di docs.** Jelaskan bahwa host menerima proof dan public inputs untuk verifikasi, tetapi tidak menerima wallet address. Jika ingin host tidak menerima nullifier/revocation handle/raw proof, alur verifikasi harus diubah dan diuji ulang.
5. **P1 — Sinkronkan docs dan checker publik.** Perbarui root Testnet/hitungan test yang stale, kontrak `GET /api/session` versus `POST /api/verify`, serta ekspektasi `/demo` pada `production-acceptance.mjs`; rerun checker sampai hijau.
6. **P1 — Tambah test integrasi yang menutup celah bukti.** Jalankan real Noir proof melalui verifier + PostgreSQL challenge/nullifier store untuk valid/replay/expiry/revocation/domain separation; uji persistensi setelah restart. Laporkan coverage tambahan secara terpisah dari coverage V8 terpilih.

## Rujukan internal utama

- SOW lampiran pengguna, bagian 4.1, 5.1, dan 6.1.
- `contracts/veilpass-gate/src/lib.rs`, `contracts/veilpass-gate/src/test.rs`, `frontend/packages/proof/circuits/membership/src/main.nr`.
- `frontend/packages/sdk/src/index.ts`, `frontend/packages/shared/src/contracts.ts`, `frontend/packages/server/src/verifier.ts`, `frontend/app/api/verify/route.ts`, `frontend/lib/server/postgres-challenge-store.ts`.
- `frontend/components/enrollment/enrollment-flow.tsx`, `frontend/components/demo/demo-bench.tsx`, `frontend/lib/demo/machine.ts`, `frontend/tests/e2e/product.spec.ts`.
- `frontend/vitest.config.mts`, `frontend/playwright.config.ts`, `frontend/scripts/production-acceptance.mjs`, `frontend/docs/evidence/contract.md`, `frontend/docs/evidence/delivery-status.md`.
