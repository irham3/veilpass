# Audit Implementasi Deliverable VeilPass

**Tanggal audit:** 10 September 2026
**Repository:** `irham3/veilpass`
**Branch dan revisi:** `master` pada `c1bbc6c6a39610be14b7cf41329aa8cdff4821fc`

> **Pembaruan implementasi pada 10 September 2026:** temuan yang dapat diperbaiki hanya dari repository telah diterapkan setelah audit ini: unit test CLI dipisahkan dari executable wallet, helper WSL dinormalisasi dan dilindungi `.gitattributes`, test circuit domain separation ditambahkan, runtime configuration validator/health endpoint ditambahkan, copy/docs stale diperbaiki, dan runbook operator dibuat. Status deployment publik, database, root Testnet, wallet owner, dan video tetap membutuhkan tindakan operator sebagaimana dijelaskan dalam [runbook live acceptance](operator-acceptance-runbook-2026-09-10.md).
**Acuan:** Statement of Work Instawards VeilPass tertanggal 2 Agustus 2026

## Kesimpulan Utama

Belum seluruh scope Instawards selesai secara operasional dan belum seluruh evidence siap diserahkan kepada reviewer.

Source code untuk contract, circuit, SDK, hosted login, verifier, session, enrollment, dashboard, dokumentasi, dan demo sudah tersedia. Contract Testnet juga masih dapat dibaca dan proof Noir/UltraHonk dapat dibuat serta diverifikasi secara lokal. Namun, status "selesai" pada proposal tidak hanya memerlukan source code. Proposal juga mensyaratkan alur publik yang benar-benar dapat digunakan, dua origin dApp yang berbeda, live Freighter enrollment, rejection cases yang dibuktikan secara end-to-end, network capture, transaction links, dan video review.

Status akhirnya adalah:

| Nomor | Deliverable | Status audit | Kesimpulan singkat |
| --- | --- | --- | --- |
| 1 | Private Gate Core | **Sebagian besar terimplementasi, belum accepted end-to-end** | Contract dan proof core ada serta dapat diuji, tetapi root Testnet belum sinkron dengan tree baru, konfigurasi operator belum siap, dan rejection cases belum diuji sebagai satu alur proof nyata. |
| 2 | SDK and Hosted Login | **Terimplementasi di source, belum operasional pada deployment publik** | SDK, popup, Freighter flow, challenge, local proof, verifier, dan cookie session ada. Deployment publik saat audit gagal pada origin/login configuration dan paket belum memiliki artefak release publik. |
| 3 | Two-dApp Demo and Docs | **Parsial** | Demo dan dua host lokal ada. Dua origin publik independen, live acceptance, network capture, expiry demo, dan video belum tersedia. Dokumentasi source sudah diperbarui; bukti publik masih belum tersedia. |
| 4 | Tidak didefinisikan dalam SOW | **Tidak dapat diaudit sebagai deliverable** | Dokumen sumber hanya menetapkan Deliverable 1 sampai 3. |
| 5 | Tidak didefinisikan dalam SOW | **Tidak dapat diaudit sebagai deliverable** | Bagian 5 pada SOW adalah execution plan, bukan Deliverable 5. |

Dengan demikian, jawaban atas pertanyaan "apakah Deliverable 1-5 sudah semua terimplementasi" adalah **belum**. Selain itu, SOW yang dilampirkan sebenarnya hanya memiliki tiga deliverable. Audit ini tidak mengarang Deliverable 4 dan 5. Execution plan dan evidence checklist yang berada pada bagian 5 dan 6 SOW tetap diaudit sebagai persyaratan lintas-deliverable.

## Cara Status Ditentukan

Audit memakai empat tingkat bukti:

1. **Source present:** file dan fungsi ada di repository.
2. **Locally verified:** pemeriksaan atau test dapat dijalankan pada workstation audit.
3. **CI verified:** workflow pada revisi repository yang sama lulus.
4. **Live accepted:** reviewer dapat menjalankan alur publik dengan wallet nyata dan memperoleh evidence proposal.

Suatu item tidak diberi status selesai penuh hanya karena UI atau fixture menampilkan hasil yang diharapkan. Untuk scope ini, klaim seperti stable private ID, domain separation, replay rejection, expiry, dan revocation harus berasal dari challenge, credential, proof, policy, serta state Testnet yang nyata.

## Ringkasan Verifikasi 10 September 2026

| Pemeriksaan | Hasil | Arti |
| --- | --- | --- |
| GitHub Actions revision `c1bbc6c` | **Lulus** | Job `Quality and package build` serta `Browser and accessibility` lulus pada [run 34427421813](https://github.com/irham3/veilpass/actions/runs/34427421813). |
| ESLint | **Lulus lokal** | `npm run lint` selesai tanpa error. |
| TypeScript | **Lulus lokal** | `npm run typecheck` selesai tanpa error. |
| Soroban Rust tests | **Lulus lokal** | 3 test lulus. |
| Stellar Testnet smoke | **Lulus read-only** | `get_gate` dan `is_revoked` berhasil dibaca dari contract. |
| NoirJS runtime proof | **Lulus lokal** | Proof 14.656 byte, 11 public inputs, dan verification key terpin berhasil diverifikasi. |
| Noir native WSL check | **Lulus setelah remediasi** | `.gitattributes` memaksa LF pada helper/toolchain dan `npm run proof:check` menyelesaikan dua circuit test, witness, UltraHonk prove, serta verify di WSL. |
| Vitest | **Lulus setelah remediasi** | 18 file dan 60 test lulus. Formatter env dipisahkan dari CLI wallet agar test tidak memuat executable SDK. |
| Package build dan dry-run pack | **Lulus lokal** | `@veilpass/shared`, `@veilpass/sdk`, `@veilpass/server`, dan contract bindings dapat dibangun dan diperiksa sebagai tarball dry-run. |
| npm registry | **Belum dipublikasikan** | `@veilpass/sdk`, `@veilpass/server`, dan `@veilpass/shared` belum tersedia pada npm registry saat audit. |
| GitHub Release | **Belum ada** | Repository belum memiliki release/tag bundle yang memuat package artifact dan evidence. |
| Next.js production build | **Lulus lokal** | Build selesai setelah akses Google Fonts tersedia. |
| Playwright | **26 skenario menampilkan status lulus, teardown hang lokal** | Semua kasus desktop/mobile selesai lulus, tetapi command tidak menutup web server dengan bersih dan harus dihentikan manual. GitHub Actions browser job lulus. |
| URL publik utama | **HTTP 200** | `/`, `/demo`, `/dashboard`, dan `/docs` tersedia pada `https://veilpass-stellar.vercel.app`. |
| Public challenge endpoint | **Gagal** | Request same-origin yang normal ke `/api/challenges` ditolak dengan `ORIGIN_MISMATCH`. |
| Login origin yang tertanam pada host publik | **Gagal** | Host publik menunjuk ke `https://veilpass-psi.vercel.app`, tetapi `/`, `/login`, dan `/dashboard/enroll` pada origin tersebut merespons 404. |
| Dua origin publik App A dan App B | **Belum ditemukan** | Repository hanya mendokumentasikan satu production URL. Pemisahan origin nyata saat ini baru tersedia lewat `app-a.localhost`, `app-b.localhost`, dan `login.localhost`. |
| Review video dan redacted network capture | **Belum ada** | Pencarian repository tidak menemukan file atau link rekaman/capture final. |

## State Contract Testnet Saat Audit

Contract Testnet dapat dibaca melalui `npm run contract:smoke`.

| Field | Nilai |
| --- | --- |
| Contract ID | `CC7FUOFBIZ7UIOG7J66QJZCWU3L2MM4GW2HZUHMSF4ZBKOGCVZ4UYJZY` |
| Gate ID | `premium-holder` |
| Owner | `GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM` |
| Epoch | `1` |
| Policy hash | `824a57f759b435e5e7f300f65dad132ff8039fa83805f19a2169893319eea0d7` |
| Credential root | `853beeab108a74b7fe1410d6bebb1a5bdca9ad416ebdf0cc92ab248332ad2bdc` |
| Zero revocation fixture | `false` |

Contract tersebut aktif, tetapi credential root yang terpasang adalah root lama. Durable credential tree yang baru memulai state kosong dari field nol. Karena root database awal dan root contract tidak sama, issuance baru akan berhenti dengan pesan bahwa tree tidak sinkron. Ini adalah blocker utama live enrollment.

Evidence deployment awal tersedia di [contract.md](./contract.md), termasuk upload, deploy, dan gate initialization transaction. Belum ada transaction evidence untuk root baru hasil issuance, revocation credential nyata, atau epoch reset yang menyiapkan Merkle lifecycle terbaru.

## Audit Deliverable 1 Private Gate Core

### 1.1 Soroban Testnet contract

**Status:** terimplementasi dan live, tetapi lifecycle terbaru belum diaktifkan.

Yang sudah ada:

- [Contract source](../../../contracts/veilpass-gate/src/lib.rs) menyimpan owner, policy hash, credential root, epoch, dan timestamp update.
- Contract menyediakan `create_gate`, `update_root`, `rotate_epoch`, `revoke`, `get_gate`, dan `is_revoked`.
- Event `GateCreated`, `RootUpdated`, `EpochRotated`, dan `CredentialRevoked` tersedia.
- Hanya owner yang dapat mengubah root, melakukan epoch rotation, dan melakukan revocation.
- Persistent storage TTL diperpanjang pada operasi yang relevan.
- [Contract tests](../../../contracts/veilpass-gate/src/test.rs) memeriksa owner authorization, duplicate/missing gate, stale epoch, root update, epoch rotation, revocation, event, dan TTL.
- Contract ID masih dapat dibaca dari Stellar Testnet pada audit ini.

Yang belum:

- Root Testnet belum disiapkan untuk sparse Merkle tree baru.
- Belum ada transaksi root update yang dihasilkan dari credential issuance nyata.
- Belum ada transaksi revocation untuk credential nyata dan bukti bahwa verifier langsung menolaknya.
- Secret/operator identity yang dapat menandatangani root publish belum tersedia pada konfigurasi lokal. Audit hanya memeriksa keberadaan variabel, tidak membaca atau menyalin secret.

### 1.2 Asset-based eligibility rule

**Status:** terimplementasi di source dan unit test, belum dibuktikan pada wallet live.

Yang sudah ada:

- [eligibility.ts](../../lib/stellar/eligibility.ts) membaca account Testnet melalui Horizon.
- Rule mencocokkan asset code, issuer, dan minimum balance.
- Native XLM tidak dianggap sebagai asset eligibility non-native.
- [eligibility.test.ts](../../lib/stellar/eligibility.test.ts) menguji fungsi rule.
- Enrollment API menolak account yang tidak eligible sebelum challenge diberikan.

Yang belum:

- Tidak ada evidence account holder Testnet yang memiliki trustline dan saldo asset yang dipakai untuk enrollment final.
- Tidak ada captured Horizon response yang sudah direduksi/redacted sebagai evidence.
- Tidak ada browser test dengan Freighter nyata karena approval wallet harus dilakukan pemilik wallet.

### 1.3 Domain-bound membership circuit

**Status:** terimplementasi dan proof runtime valid.

Yang sudah ada:

- [Noir circuit](../../packages/proof/circuits/membership/src/main.nr) memverifikasi credential commitment, leaf, path Merkle depth 16, credential root, gate, epoch, credential expiry, proof expiry, private app ID, login nullifier, dan revocation hash.
- `private_app_id` diturunkan dari subject secret, gate hash, dan normalized origin hash.
- `login_nullifier` diturunkan dari subject secret dan challenge hash.
- [Browser prover](../../packages/proof/src/noir.ts) menjalankan Noir/UltraHonk di hosted-login page dan tidak mengirim subject secret ke server.
- [Server verifier](../../lib/server/zk-verifier.ts) merekonstruksi 11 public inputs dan memverifikasi proof terhadap verification key yang dipin.
- Circuit artifact, verification key, dan manifest tersedia di `frontend/public/proof/`.
- `npm run proof:runtime` berhasil membuat dan memverifikasi proof nyata saat audit.

Yang belum atau kurang kuat:

- Test circuit native hanya memiliki satu happy-path witness. Belum ada kumpulan test Noir yang eksplisit untuk wrong domain, wrong gate, wrong epoch, wrong root, expired credential, expired proof, dan incorrect nullifier.
- Test server dengan real proof membuktikan happy path dan tampered origin, tetapi replay, expiry, stale epoch, dan revocation pada test verifier utama masih memakai proof verifier fixture/simulator sebagai callback.
- Belum ada satu integration test yang menggabungkan real Noir proof, challenge store, live/deterministic gate policy, consumption, replay, expiry, dan revocation dalam satu pipeline.
- Sebelumnya `npm run proof:check` tidak repeatable pada checkout Windows dengan `core.autocrlf=true`; ini telah diperbaiki dengan `.gitattributes` dan normalisasi helper WSL. Fresh checkout berikutnya akan memakai LF untuk file toolchain.

### 1.4 Stable private ID dan one-time challenge nullifier

**Status:** formula kriptografis terimplementasi, acceptance lintas origin belum live.

Yang sudah ada:

- Stable same-domain ID dihasilkan dari subject secret, gate, dan exact normalized origin.
- Origin yang berbeda menghasilkan input hash yang berbeda.
- Challenge terdiri dari 32 random bytes; server menyimpan digest, gate, origin, expiry, dan spent state.
- [PostgreSQL challenge store](../../lib/server/postgres-challenge-store.ts) mengunci challenge row dan mengonsumsi nullifier secara atomik.
- Response host dibatasi oleh [shared schema](../../packages/shared/src/contracts.ts) dan tidak memiliki wallet address, root, commitment, nullifier, revocation handle, atau proof.

Yang belum:

- Stabilitas App A dan App B yang terlihat pada `/demo` masih berasal dari [hard-coded demo machine](../../lib/demo/machine.ts), bukan output proof live.
- App A dan App B baru diuji sebagai `*.localhost`; belum ada dua HTTPS origin publik.
- PostgreSQL adapter belum memiliki integration test terhadap database nyata pada evidence repository.
- Live deployment belum dapat mengeluarkan challenge yang sah dari origin publik saat audit.

### 1.5 Required tests valid login domain separation replay expiry revocation

**Status:** coverage logika ada, tetapi evidence end-to-end belum lengkap.

| Kasus wajib | Bukti saat ini | Kekurangan |
| --- | --- | --- |
| Valid login | Real Noir proof runtime lulus; verifier fixture lulus | Belum live dengan credential hasil Freighter dan root Testnet yang sinkron. |
| Domain separation | Formula ada; real-proof tampered-origin test ditolak; local two-host UI test ada | Belum membuat dua valid proof dari secret yang sama pada dua HTTPS origin publik dan membandingkan ID. |
| Replay | Challenge/nullifier store test menolak replay | Belum replay proof real pada deployment dengan PostgreSQL. |
| Expiry | Verifier unit test memeriksa expiry | Belum demo reviewer-visible dengan challenge/proof real. `/demo` juga belum memiliki aksi expiry. |
| Revocation | Contract test dan verifier unit test ada | Belum revoke revocation hash credential nyata pada Testnet lalu mencoba proof baru. |

### Kesimpulan Deliverable 1

Deliverable 1 **belum boleh ditandai selesai penuh**. Core implementation-nya sudah kuat dan contract Testnet hidup, tetapi acceptance membutuhkan root/database/operator yang sinkron dan satu matriks real-proof test untuk seluruh rejection cases.

## Audit Deliverable 2 SDK and Hosted Login

### 2.1 TypeScript SDK

**Status:** terimplementasi dan buildable; distribusi final belum tersedia.

Yang sudah ada:

- [SDK source](../../packages/sdk/src/index.ts) menyediakan `VeilPass.login`.
- SDK membuat fresh host challenge, membuka popup login, memakai random request state, memvalidasi exact event origin dan source window, lalu mengirim proof ke host verifier.
- [Popup channel validation](../../packages/sdk/src/channel.ts) memakai strict runtime schema.
- Build ESM, CJS, source map, dan TypeScript declaration lulus.
- Dry-run package inspection lulus untuk SDK, server, shared, dan contract bindings.

Yang belum:

- Tidak ada package pada npm registry.
- Tidak ada GitHub Release yang menyertakan `.tgz`, checksum, version/tag, changelog, dan contoh instalasi dari artifact.
- Demo host dalam repository masih mengimpor workspace package; belum ada clean sample app di luar monorepo yang memasang artifact hasil pack.

Publikasi npm tidak wajib apabila reviewer menerima package artifact lain. Namun, harus ada artifact yang dapat diunduh dan dipasang. `npm pack --dry-run` saja belum menjadi evidence package yang dapat reviewer ambil.

### 2.2 Hosted sign-in popup

**Status:** terimplementasi secara lokal, rusak pada deployment publik saat audit.

Yang sudah ada:

- `/login` menggunakan [LoginSurface](../../components/login/login-surface.tsx).
- Popup menunggu challenge dari exact opener, memuat credential dari IndexedDB, memperbarui Merkle witness, membuat local proof, dan mengirim proof kembali ke opener.
- Request state, source window, host origin, login origin, gate, dan challenge schema divalidasi.

Yang belum atau rusak:

- Host publik menyematkan login origin `https://veilpass-psi.vercel.app`, tetapi origin itu mengembalikan HTTP 404 untuk halaman utama, `/login`, dan `/dashboard/enroll`.
- `https://veilpass-stellar.vercel.app/api/challenges` menolak request dengan origin publik yang normal sebagai `ORIGIN_MISMATCH`.
- Halaman publik masih menampilkan teks `Simulated proof`, sehingga deployment bukan build final yang konsisten dengan source saat ini.

### 2.3 Freighter enrollment

**Status:** source lengkap, belum live accepted.

Yang sudah ada:

- [EnrollmentFlow](../../components/enrollment/enrollment-flow.tsx) memeriksa keberadaan Freighter.
- Wallet diwajibkan memakai Stellar Testnet.
- Address access dan message signing memerlukan persetujuan user.
- Privacy disclosure menjelaskan issuer melihat wallet address pada enrollment.
- Subject secret dan credential salt dibuat di browser; credential disimpan pada IndexedDB.
- Issuance API memvalidasi signature wallet, issuer configuration, contract policy, Merkle root publication, dan issuer signature.

Yang belum:

- Tidak ada evidence trustline VPT dan holder funding untuk account reviewer.
- Tidak ada live Freighter transaction/message approval capture.
- Konfigurasi lokal belum valid untuk menjalankan alur: `DATABASE_URL` tidak lolos validasi sintaks, `VEILPASS_LOGIN_ORIGIN` malformed, dan `VEILPASS_GATE_OWNER_SECRET` belum terisi.
- Root contract dan database tree belum sinkron.

### 2.4 Fresh challenge local proof verifier and cookie session

**Status:** terimplementasi di source; production acceptance belum ada.

Yang sudah ada:

- [Challenge route](../../app/api/challenges/route.ts) membuat challenge baru dan fail-closed di production tanpa durable store.
- [Verifier route](../../app/api/verify/route.ts) memakai real Noir verifier, memeriksa live gate policy, dan mengonsumsi challenge/nullifier.
- [Session route](../../app/api/session/route.ts) membaca opaque session.
- Cookie yang dibuat memiliki `HttpOnly`, `SameSite=Lax`, `Secure` pada production, scoped path, dan max-age sesuai proof expiry.
- Production verifier tidak menerima HMAC simulator sebagai proof valid.

Yang belum:

- Tidak ada production PostgreSQL run yang dibuktikan pada report.
- Tidak ada restart/persistence test untuk challenge, nullifier, dan session.
- Tidak ada network capture dari App A/App B publik yang membuktikan host tidak menerima wallet address.
- Public API saat ini tertahan origin misconfiguration sebelum mencapai challenge issuance.

### 2.5 Return value privacy boundary

**Status:** terimplementasi pada schema dan unit/browser fixture; belum dibuktikan pada live traffic.

Success result berisi:

```json
{
  "ok": true,
  "privateAppId": "field-derived-id",
  "gateId": "premium-holder",
  "epoch": 1,
  "origin": "https://app-a.example",
  "expiresAt": "ISO-8601 timestamp"
}
```

Tidak ada wallet address pada schema tersebut. Akan tetapi, evidence proposal meminta network capture. Test dengan fake known-wallet marker bukan pengganti capture traffic dari enrollment dan login nyata.

### Kesimpulan Deliverable 2

Deliverable 2 **belum selesai secara publik**. Implementasi source sudah mencakup hampir seluruh komponen, tetapi deployment dan distribution evidence belum memenuhi definisi selesai.

## Audit Deliverable 3 Two-dApp Demo and Docs

### 3.1 Public Testnet demo

**Status:** halaman publik hidup, alur private login publik belum hidup.

Yang sudah ada:

- `https://veilpass-stellar.vercel.app`, `/demo`, `/dashboard`, dan `/docs` merespons HTTP 200.
- Dashboard dapat membaca contract Testnet bila environment public contract benar.
- Landing page dan demo menjelaskan privacy boundary sempit.

Yang belum:

- `/demo` memakai [DemoBench](../../components/demo/demo-bench.tsx) dan [demo machine](../../lib/demo/machine.ts) dengan ID serta hasil rejection yang sudah ditetapkan di source.
- Public challenge endpoint gagal origin validation.
- Public login origin yang dikonfigurasi tidak menyediakan login page.
- UI publik masih merepresentasikan simulator, bukan real proof flow terbaru.

### 3.2 App A and App B

**Status:** dua origin lokal ada; dua origin publik independen belum ada.

Yang sudah ada:

- `http://app-a.localhost:3000` dan `http://app-b.localhost:3000` dirutekan sebagai dua browser origin berbeda.
- `http://login.localhost:3000` dapat menjadi hosted-login origin ketiga pada local setup.
- Host page memakai SDK yang sama dan menampilkan minimized result.
- Playwright memeriksa routing dua host lokal.

Yang belum:

- Belum ada dua URL HTTPS publik untuk App A dan App B.
- `/host/app-a` dan `/host/app-b` pada domain Vercel yang sama adalah dua path, bukan dua origin.
- Tidak ada deployment environment matrix per host.
- Tidak ada proof live yang menunjukkan same wallet/credential menghasilkan ID sama saat kembali ke App A dan ID berbeda pada App B.

### 3.3 Repeat login replay expiry revocation

**Status:** ditampilkan oleh fixture demo, belum live accepted.

- Repeat login dan cross-domain comparison pada `/demo` memakai ID hard-coded.
- Replay dan revocation pada `/demo` memakai state machine lokal.
- Tidak ada tombol/skenario expiry pada reviewer bench.
- Verifier logic untuk replay, expiry, stale epoch, dan revocation tersedia pada unit tests.
- Belum ada rekaman proof replay, wait-to-expiry, dan on-chain revocation pada deployment publik.

### 3.4 Gate dashboard

**Status:** terimplementasi, live administrative acceptance belum direkam.

Yang sudah ada:

- [Dashboard](../../app/dashboard/page.tsx) membaca gate state melalui RPC.
- [Contract actions](../../components/dashboard/contract-actions.tsx) dapat membuat, memperbarui root, rotate epoch, dan revoke menggunakan Freighter.
- UI meminta persetujuan Freighter dan menampilkan link transaksi Stellar Expert bila submission berhasil.

Yang belum:

- Belum ada evidence dashboard digunakan oleh actual gate owner untuk root reset/publish dan revocation credential.
- Sebelumnya tombol memakai istilah `Simulate and ...`; copy sudah diperbaiki menjadi aksi Freighter/Testnet yang eksplisit.
- Runbook operator untuk update root versus rotate epoch, database, origin, Freighter, acceptance, dan video tersedia di [operator-acceptance-runbook-2026-09-10.md](operator-acceptance-runbook-2026-09-10.md). Recovery produksi tetap membutuhkan keputusan dan akses operator karena tidak aman untuk diotomatisasi dari repository.

### 3.5 Developer docs API privacy boundary threat model test report

**Status:** tersedia tetapi perlu konsolidasi dan koreksi.

Yang sudah ada:

- Developer navigation mencakup quickstart, client, server, identity, enrollment, contract, errors, privacy, threat model, API, dan examples.
- [README](../../../README.md) menjelaskan arsitektur, environment, contract, proof, deployment, test, dan scope boundary.
- [claim-audit.md](./claim-audit.md), [proof.md](./proof.md), [contract.md](./contract.md), [test-report.md](./test-report.md), serta [live-acceptance-checklist.md](./live-acceptance-checklist.md) tersedia.

Masalah yang harus diperbaiki:

- [docs content](../../lib/docs/content.ts) masih mengatakan active repository memakai deterministic simulated adapter dan real prover baru akan dipakai nanti. Ini bertentangan dengan `noir.ts`, `zk-verifier.ts`, dan README terbaru.
- Quickstart server snippet tidak mencantumkan dependency wajib `policy`, durable `store`, `verifyProof`, dan `requestId`; contoh tidak copy-paste complete.
- API reference menyebut hanya dua endpoint, sedangkan aplikasi juga mempunyai enrollment challenge, enrollment issue, witness refresh, session, dan dev-only simulate endpoint.
- [proof package README](../../packages/proof/README.md) menyatakan generated proof material/verification key tidak committed, padahal browser artifact dan verification key memang committed di `public/proof`.
- [implementation-gap-plan.md](../../../docs/implementation-gap-plan.md) adalah audit lama yang masih menyatakan active path memakai server HMAC. Dokumen itu perlu diberi banner `Superseded` atau dipindahkan ke arsip agar tidak menjadi evidence yang saling bertentangan.
- Test report bertanggal 2 September dan merujuk revisi/working-tree lama. Perlu report baru dari revisi master final.

### 3.6 Review video and evidence bundle

**Status:** belum tersedia.

Belum ditemukan:

- Video review singkat.
- Dua live URL App A/App B.
- Redacted HAR/network capture.
- Root-update transaction dari issuance.
- Credential-revocation transaction dan hasil rejection setelahnya.
- Screenshot live Freighter enrollment dan repeat-login comparison.
- Release/tag final yang mengikat source commit, package artifacts, contract evidence, test report, dan video.

### Kesimpulan Deliverable 3

Deliverable 3 **masih parsial dan merupakan gap terbesar**. Source UI, docs, dan test bench ada, tetapi reviewer belum dapat menjalankan alur yang dijanjikan proposal tanpa membaca source atau menerima simulasi.

## Deliverable 4 dan 5

SOW yang dilampirkan tidak memiliki Deliverable 4 atau Deliverable 5. Struktur dokumennya adalah:

- Bagian 4.1: Deliverable 1, Deliverable 2, dan Deliverable 3.
- Bagian 5: 30-Day Execution Plan and Timeline.
- Bagian 6: Evidence of Completion.

Jika "Deliverable 4 dan 5" dimaksudkan sebagai dokumen lain, dokumen tersebut harus ditambahkan sebagai source-of-truth sebelum audit dapat menyatakan implementasinya. Jika yang dimaksud adalah Week 4 dan Evidence of Completion, keduanya belum selesai karena public end-to-end run, independent origins, network capture, dan video masih belum ada.

## Blocker Konfigurasi yang Ditemukan

Audit hanya memeriksa validitas dan keberadaan konfigurasi; nilai secret tidak disalin ke laporan.

| Konfigurasi | Kondisi | Dampak |
| --- | --- | --- |
| `DATABASE_URL` lokal | Ada tetapi sintaks tidak valid | Migrasi dan durable challenge/session/tree tidak dapat dipakai. |
| `VEILPASS_LOGIN_ORIGIN` lokal | Malformed | Exact-origin validation dan popup binding gagal. |
| `VEILPASS_HOST_ORIGIN` lokal | Valid untuk localhost | Hanya cocok untuk local single-origin default, bukan final three-origin topology. |
| `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` lokal | Valid untuk localhost | Perlu diganti per deployment publik. |
| `VEILPASS_ISSUER_SECRET` lokal | Ada dan dapat diparse | Cukup untuk issuer, tetapi bukan gate owner. |
| `VEILPASS_GATE_OWNER_SECRET` lokal | Belum ada | Automatic root publication tidak dapat berjalan. |
| Asset rule lokal | Field yang diperlukan tersedia | Tetap membutuhkan trustline dan holder funding live. |

Jangan mengirim seed/secret ke chat, commit, screenshot, video, atau issue tracker. Secret harus disimpan di local ignored env untuk development dan secret manager deployment untuk production/demo publik.

## Rencana Penyelesaian Terperinci

Urutan di bawah dibuat berdasarkan dependency. Menjalankan deployment sebelum database, root, dan origin benar hanya menghasilkan UI 200 dengan login yang tetap gagal.

### Tahap 0 Membekukan Scope dan Evidence Target

1. Konfirmasi bahwa scope resmi hanya Deliverable 1 sampai 3.
2. Bila memang ada Deliverable 4 dan 5 pada dokumen lain, tambahkan dokumen tersebut sebelum status final dibuat.
3. Tetapkan satu commit release kandidat dari `master`.
4. Buat checklist evidence dengan owner dan URL output untuk setiap item.
5. Jangan mengubah out-of-scope MVP: tidak perlu private payment, wallet replacement, browser extension, blind issuance, mainnet, audit produksi, recovery penuh, cross-chain, atau credential marketplace.

**Selesai bila:** daftar scope dan evidence tidak ambigu, dan tidak ada item bernomor yang berasal dari asumsi.

### Tahap 1 Memperbaiki Portabilitas dan Test Baseline

1. Tambahkan `.gitattributes` di repository root:

   ```gitattributes
   *.sh text eol=lf
   *.mjs text eol=lf
   *.ps1 text eol=crlf
   *.rs text eol=lf
   *.ts text eol=lf
   *.tsx text eol=lf
   ```

2. Normalisasi minimal file yang digunakan lint/test/toolchain, terutama `frontend/scripts/noir-check-wsl.sh` dan `frontend/scripts/local-env.mjs`. **Selesai:** `.gitattributes` kini memaksa LF dan helper telah diverifikasi dari WSL.
3. Guard executable entrypoint `local-env.mjs` agar aman saat module di-import. **Selesai:** formatter murni dipisahkan ke `local-env-format.mjs`, sehingga test tidak memuat executable wallet:

   ```js
   if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
     // run CLI
   }
   ```

4. Jalankan dari Node 22 sesuai CI, bukan mengandalkan Node 24 workstation:

   ```powershell
   node --version
   npm --version
   npm ci
   npm run lint
   npm run typecheck
   npm test
   npm run proof:check
   npm run proof:runtime
   npm run contract:test
   npm run pack:check
   npm run build
   npm run test:e2e
   ```

5. Perbaiki Playwright teardown Windows. Pastikan command exit code 0 setelah summary, tidak memerlukan `Ctrl+C`, dan tidak meninggalkan `next dev` child process.
6. Simpan output test baru pada report bertanggal dan commit SHA yang sama.

**Selesai bila:** seluruh command selesai sendiri dengan exit code 0 pada Windows dan GitHub Actions.

### Tahap 2 Menyiapkan PostgreSQL Durable State

1. Provision PostgreSQL/Neon database khusus demo Testnet.
2. Buat database role minimum-privilege untuk aplikasi.
3. Pastikan connection string valid, memakai TLS, dan disimpan sebagai secret.
4. Perbaiki `.env.local` tanpa mencetak connection string ke terminal/chat.
5. Terapkan migrasi secara urut:

   ```powershell
   cd frontend
   npm run db:migrate
   ```

   Migrasi yang wajib ada adalah:

   - `drizzle/0000_veilpass_mvp.sql`
   - `drizzle/0001_enrollment_challenge_gate.sql`
   - `drizzle/0002_credential_merkle_tree.sql`

6. Verifikasi tabel challenge, nullifier, enrollment, session, credential, dan Merkle nodes tersedia.
7. Tambahkan integration test terhadap database nyata untuk:

   - issue dan consume challenge;
   - dua consume paralel hanya menghasilkan satu sukses;
   - nullifier duplicate ditolak;
   - expired challenge ditolak;
   - session bertahan setelah process restart;
   - enrollment challenge one-time;
   - credential witness lama dapat direfresh setelah leaf kedua;
   - publish-root failure tidak menyimpan credential/tree setengah jadi.

**Selesai bila:** production mode tidak memakai in-memory fallback dan persistence/replay test lulus setelah restart.

### Tahap 3 Menyinkronkan Contract Root dan Credential Tree

1. Pastikan pemilik secret contract adalah account public `GCUSQB6ZWO633HV7M3EF6BCWSYQMTA65RJU4OMQ435OAQ3WJRIVA43VM`.
2. Jangan menempelkan secret tersebut di chat. Masukkan sebagai `VEILPASS_GATE_OWNER_SECRET` hanya pada login/issuer service secret manager.
3. Putuskan reset strategy:

   - Jika dipastikan tidak ada credential aktif yang harus dipertahankan, owner dapat menjalankan `update_root` pada epoch 1 ke zero field.
   - Pilihan yang lebih eksplisit untuk memutus state legacy adalah `rotate_epoch` ke epoch 2 dengan zero root. Ini direkomendasikan bila status credential lama tidak pasti.

4. Pastikan database credential tree benar-benar kosong sebelum contract root diubah menjadi zero root. Jangan reset contract jika database menyimpan tree yang perlu dipertahankan.
5. Lakukan transaksi melalui dashboard menggunakan Freighter owner atau melalui operator service yang memiliki owner secret.
6. Tunggu konfirmasi ledger dan simpan transaction hash.
7. Jalankan `npm run contract:smoke` dan pastikan root/epoch sama dengan database bootstrap state.
8. Enroll credential pertama. Issuance harus:

   - membuat leaf dan witness;
   - menghitung proposed root;
   - mengirim `update_root`;
   - menunggu transaction confirmation;
   - menyimpan nodes dan credential hanya setelah publish berhasil;
   - mengembalikan issuer-signed credential kepada browser.

9. Simpan root-update transaction link sebagai evidence.

**Selesai bila:** first enrollment menghasilkan root baru yang sama di contract, database, credential, dan proof public inputs.

### Tahap 4 Menyiapkan Testnet Asset dan Freighter Holder

1. Gunakan Freighter yang disetel ke Stellar Testnet.
2. Pastikan asset code, issuer, dan minimum balance konsisten pada seluruh deployment.
3. Tambahkan trustline asset `VPT` pada holder wallet.
4. Danai holder menggunakan issuer tooling setelah trustline ada:

   ```powershell
   cd frontend
   npm run asset:issue -- <FREIGHTER_TESTNET_PUBLIC_KEY>
   ```

5. Jangan pernah meminta holder secret. Yang diperlukan untuk issuance asset hanya public key holder; Freighter sendiri yang melakukan approval enrollment message.
6. Jalankan eligibility check dan pastikan account di bawah minimum ditolak dengan `NOT_ELIGIBLE`.
7. Simpan evidence yang aman: asset code, issuer public key, holder public key hanya pada enrollment-side evidence bila memang perlu, dan jangan menaruh wallet address pada host-side capture.

**Selesai bila:** holder eligible dapat memperoleh enrollment challenge, sedangkan holder non-eligible ditolak.

### Tahap 5 Membuat Topologi Tiga Origin Publik

Gunakan tiga exact HTTPS origins:

```text
https://login.<domain>
https://app-a.<domain>
https://app-b.<domain>
```

Deployment yang disarankan:

1. **Login service** menyediakan `/login`, `/dashboard/enroll`, enrollment APIs, witness API, circuit artifact, issuer key, gate-owner root publisher, dan credential tree DB access.
2. **App A** menyediakan host UI, `/api/challenges`, `/api/verify`, `/api/session`, contract read configuration, verification key, dan host session DB access.
3. **App B** menyediakan komponen yang sama seperti App A, tetapi dengan exact origin dan session namespace sendiri.

Environment per host harus konsisten:

```text
VEILPASS_HOST_ORIGIN=https://app-a.<domain>   # atau app-b untuk deployment B
VEILPASS_LOGIN_ORIGIN=https://login.<domain>
NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN=https://login.<domain>
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_STELLAR_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_VEILPASS_CONTRACT_ID=<contract id>
NEXT_PUBLIC_VEILPASS_SOURCE_ACCOUNT=<public source account>
VEILPASS_GATE_IDS=premium-holder
DATABASE_URL=<secret connection string>
```

Login service menambahkan issuer dan gate-owner secrets. Host deployments tidak perlu menerima wallet issuer/gate-owner secret. Gunakan database role yang dipisah bila memungkinkan.

Setelah deploy:

1. GET ketiga origin harus 200.
2. Host page harus menampilkan login origin yang benar dan hidup.
3. `POST /api/challenges` dari masing-masing exact host origin harus 201.
4. Origin lain harus ditolak 403 `ORIGIN_MISMATCH`.
5. `/login` harus menerima opener dari App A dan App B saja.
6. Hapus semua referensi production ke origin Vercel lama yang 404.
7. Pastikan public `/demo` tidak lagi memakai hard-coded result sebagai bukti utama. Fixture boleh tetap ada tetapi harus jelas berlabel non-production.

**Selesai bila:** reviewer mempunyai tiga URL publik dan popup login bekerja dari kedua host.

### Tahap 6 Menutup Matriks Acceptance End to End

Gunakan satu credential yang sama pada login origin.

1. **Valid login App A**
   - Issue fresh challenge.
   - Refresh witness.
   - Generate Noir proof di popup.
   - Verify server-side.
   - Pastikan host menerima minimized result dan cookie session.

2. **Repeat login App A**
   - Buat challenge baru.
   - Login kembali.
   - Pastikan `privateAppId` sama dengan login App A sebelumnya.

3. **Domain separation App B**
   - Gunakan credential browser yang sama.
   - Login ke App B.
   - Pastikan `privateAppId` berbeda dari App A.

4. **Replay**
   - Kirim ulang proof/challenge App A pertama.
   - Pastikan response `CHALLENGE_SPENT`.

5. **Expiry**
   - Buat challenge dengan TTL test yang singkat atau tunggu TTL lima menit.
   - Kirim proof setelah expiry.
   - Pastikan `CHALLENGE_EXPIRED` atau error expiry yang telah distandarkan.
   - Tampilkan skenario ini pada reviewer UI/video, bukan unit test saja.

6. **Revocation**
   - Ambil `revocationHash` credential pada operator boundary.
   - Owner mengirim transaksi `revoke`.
   - Tunggu ledger confirmation.
   - Buat challenge baru dan coba login.
   - Pastikan `CREDENTIAL_REVOKED`.

7. **Stale epoch**
   - Rotate epoch menggunakan owner.
   - Coba credential epoch lama.
   - Pastikan `STALE_EPOCH`.

8. **Privacy boundary**
   - Capture request/response App A dan App B.
   - Pastikan tidak ada Stellar address pada host request body, response body, local/session storage host, cookie payload, console, dan server log.
   - Wallet address boleh terlihat pada enrollment issuer boundary sesuai disclosure, tetapi tidak boleh dipindahkan ke host.

**Selesai bila:** semua kasus menghasilkan evidence timestamped dari origin publik dan state Testnet yang sama.

### Tahap 7 Memperkuat Automated Test

Tambahkan test berikut:

1. Real Noir proof valid dengan actual challenge store.
2. Dua valid proof dari subject secret sama untuk origin A dan B; ID A stabil dan ID B berbeda.
3. Real proof replay terhadap PostgreSQL store.
4. Real proof expired challenge/proof/credential.
5. Real proof dengan revoked hash menggunakan mocked deterministic contract state, kemudian live manual test untuk on-chain check.
6. Wrong gate, wrong epoch, wrong root, wrong challenge, wrong Merkle path, wrong commitment, wrong nullifier, dan modified public input.
7. Concurrent verifier requests terhadap challenge sama.
8. Popup closed, timeout, wrong opener, wrong state, wrong login origin, dan user rejection.
9. Production smoke yang memeriksa login origin hidup dan challenge 201 dari allowed origin.
10. Post-deploy test yang gagal jika halaman publik masih memuat `Simulated proof` sebagai status produk utama.

**Selesai bila:** unit, integration, browser, contract, circuit, package, dan live smoke mempunyai job yang jelas serta exit code deterministik.

### Tahap 8 Memperbaiki SDK Distribution dan Documentation

1. Putuskan distribution method:

   - publish `@veilpass/sdk`, `@veilpass/server`, dan `@veilpass/shared` ke npm; atau
   - attach `.tgz` artifacts ke GitHub Release.

2. Gunakan semantic version `0.1.0` untuk MVP dan buat immutable tag.
3. Generate artifacts dengan CI, bukan dari working tree developer.
4. Sertakan SHA-256 checksum setiap `.tgz`.
5. Buat clean sample host di luar workspace package resolution dan pasang artifact tersebut.
6. Jalankan sample app terhadap App A/Testnet deployment.
7. Perbarui docs:

   - hapus keterangan bahwa active path masih simulator;
   - jelaskan simulator hanya fixture non-production;
   - lengkapi server verifier snippet;
   - dokumentasikan seluruh endpoint;
   - konsistenkan artifact/VK commitment statement;
   - tandai audit lama sebagai superseded;
   - sertakan exact versions dan compatibility notes.

**Selesai bila:** reviewer baru dapat mengunduh package, mengikuti quickstart, menjalankan sample host, dan memperoleh session tanpa membaca monorepo internals.

### Tahap 9 Membuat Evidence Bundle dan Video

Evidence bundle minimum:

1. GitHub repository dan immutable commit/tag.
2. GitHub Actions run hijau.
3. Contract ID dan Stellar Expert links untuk upload, deploy, gate init/reset, root publish, dan revocation.
4. Test report baru dengan tanggal, OS, Node/npm, Noir/bb, Rust/Soroban, command, duration, dan hasil.
5. App A URL, App B URL, dan login URL.
6. Redacted HAR/network capture untuk kedua host.
7. Screenshot enrollment, App A login pertama, App A repeat, App B, replay, expiry, revocation, dan dashboard state.
8. SDK/server/shared package artifacts serta checksum.
9. Privacy boundary dan threat model final.
10. Video 3-5 menit dengan urutan:

    - tunjukkan Testnet dan gate;
    - enrollment Freighter;
    - App A login;
    - App A repeat dengan ID sama;
    - App B dengan ID berbeda;
    - replay rejection;
    - expiry rejection;
    - on-chain revocation;
    - post-revocation rejection;
    - network panel yang menunjukkan host tidak menerima wallet address.

Sebelum publikasi, redact seed, secret env, database URL, bearer/session token, raw credential secret, raw proof, nullifier, dan revocation handle. Wallet public address hanya boleh muncul pada bagian enrollment yang memang mengakui issuer visibility, bukan pada host evidence.

**Selesai bila:** setiap baris Evidence Verification Checklist proposal dapat diberi centang dan link.

## Pembagian Tindakan CLI dan Tindakan User

### Dapat dikerjakan melalui CLI oleh maintainer/Codex

- Memperbaiki line endings, test harness, docs, dan stale claims.
- Menambah unit/integration test yang tidak memerlukan wallet approval.
- Menjalankan lint, typecheck, Vitest, circuit checks, contract tests, package checks, build, dan Playwright.
- Menyiapkan deployment configuration files tanpa menaruh secret.
- Menjalankan database migration setelah valid `DATABASE_URL` tersedia.
- Membuat package tarball, checksum, release notes, dan evidence report.
- Melakukan contract read-only smoke.
- Melakukan deploy/push setelah credential dan authority yang sesuai tersedia.

### Tetap memerlukan tindakan atau persetujuan user/operator

- Menyediakan valid PostgreSQL connection string secara aman.
- Menyimpan `VEILPASS_GATE_OWNER_SECRET` pada secret manager atau memilih Freighter owner untuk transaksi bootstrap.
- Memastikan owner secret cocok dengan public owner contract.
- Menambahkan trustline VPT di Freighter holder.
- Menyetujui Freighter enrollment message.
- Menyetujui contract write lewat Freighter bila tidak memakai operator service.
- Menentukan domain final App A, App B, dan login.
- Menyetujui publikasi npm/GitHub Release serta video final.

Codex/CLI tidak boleh menggantikan approval Freighter pengguna atau menebak/membuat ulang gate-owner secret. Semua langkah lain dapat diotomatisasi setelah input aman tersebut tersedia.

## Prioritas Eksekusi

| Prioritas | Pekerjaan | Blocker yang diselesaikan |
| --- | --- | --- |
| P0 | Perbaiki `.env.local` dan production origins | Menghilangkan malformed config dan `ORIGIN_MISMATCH`. |
| P0 | Provision/migrate PostgreSQL | Mengaktifkan durable challenge, nullifier, session, dan Merkle state. |
| P0 | Sediakan gate-owner signing path | Mengaktifkan zero-root bootstrap dan root publication. |
| P0 | Sinkronkan zero root/epoch dengan DB | Mengaktifkan credential issuance nyata. |
| P0 | Deploy login, App A, dan App B pada tiga HTTPS origins | Memenuhi hosted login dan two-dApp claim. |
| P0 | Jalankan live Freighter acceptance | Membuktikan objective utama proposal. |
| P1 | Tambah real-proof rejection matrix dan PostgreSQL tests | Mengubah coverage logika menjadi coverage integrasi. |
| P1 | Perbaiki Windows line endings dan Playwright teardown | Membuat verifikasi reproducible. |
| P1 | Update docs dan hapus stale claims | Mencegah evidence saling bertentangan. |
| P1 | Buat package/release artifact | Memenuhi SDK evidence. |
| P1 | Capture network/transactions dan rekam video | Menutup Deliverable 3. |

## Definition of Done Final

VeilPass baru dapat dinyatakan menyelesaikan seluruh deliverable resmi jika semua kondisi berikut terpenuhi:

- [ ] Scope resmi dikonfirmasi hanya Deliverable 1-3 atau dokumen Deliverable 4-5 disediakan.
- [ ] Contract Testnet aktif dengan root/epoch yang sinkron dengan durable tree.
- [ ] Eligible Freighter wallet berhasil enroll pada Testnet.
- [ ] Real Noir proof dibuat di browser dan diverifikasi server.
- [ ] App A login pertama berhasil.
- [ ] App A repeat menghasilkan private ID yang sama.
- [ ] App B pada origin publik berbeda menghasilkan private ID berbeda.
- [ ] Host responses dan captures tidak mengandung wallet address.
- [ ] Replay ditolak.
- [ ] Expiry ditolak dan terlihat pada reviewer flow.
- [ ] Individual revocation dikirim ke Testnet dan login berikutnya ditolak.
- [ ] PostgreSQL atomicity dan restart persistence dibuktikan.
- [ ] Seluruh local/CI command exit code 0 tanpa hang.
- [ ] SDK package artifact dapat diunduh dan dipasang oleh clean sample app.
- [ ] Quickstart, API reference, privacy boundary, threat model, dan test report konsisten dengan build final.
- [ ] Dua host URL, login URL, tx links, network capture, screenshots, dan short review video tersedia.
- [ ] Evidence checklist reviewer terisi lengkap.

## Evidence Utama di Repository

- [Root README](../../../README.md)
- [Contract source](../../../contracts/veilpass-gate/src/lib.rs)
- [Contract tests](../../../contracts/veilpass-gate/src/test.rs)
- [Noir circuit](../../packages/proof/circuits/membership/src/main.nr)
- [Browser prover](../../packages/proof/src/noir.ts)
- [Server verifier](../../lib/server/zk-verifier.ts)
- [Verifier orchestration](../../packages/server/src/verifier.ts)
- [Credential tree](../../lib/server/credential-tree.ts)
- [Root publisher](../../lib/server/root-publisher.ts)
- [Enrollment flow](../../components/enrollment/enrollment-flow.tsx)
- [SDK](../../packages/sdk/src/index.ts)
- [Two-host local guide](../../../docs/two-host-demo.md)
- [Current delivery status](./delivery-status.md)
- [Live acceptance checklist](./live-acceptance-checklist.md)
- [GitHub Actions workflow](../../../.github/workflows/ci.yml)

## Final Recommendation

Jangan membuat video final atau mengklaim deliverable selesai sebelum Tahap 1 sampai Tahap 6 lulus. Jalur tercepat menuju acceptance bukan menambah fitur baru, melainkan memperbaiki konfigurasi, mengaktifkan durable database dan gate-owner root publication, men-deploy tiga origin HTTPS yang benar, lalu menangkap evidence dari alur real proof yang sudah ada.

Urutan praktis berikut adalah jalur kritis:

```text
test portability
-> valid PostgreSQL
-> owner/root bootstrap
-> Freighter asset + enrollment
-> three-origin deployment
-> live acceptance matrix
-> docs/package/evidence/video
```

Setelah jalur tersebut selesai, barulah perubahan final aman diberi tag, dirilis, dan dipush sebagai submission-ready evidence.
