# VeilPass — Runbook Penyelesaian Live Acceptance

**Tanggal:** 10 September 2026
**Status:** pekerjaan yang dapat dilakukan sepenuhnya dari kode sudah diterapkan; acceptance publik masih membutuhkan akses operator ke database, domain/deployment, dan wallet Testnet pemilik gate.
**Baca bersama:** [audit implementasi Deliverable 1–5](audit-deliverable-1-5-2026-09-10.md)

## Ringkasan keputusan

Repository sekarang memiliki perbaikan implementasi berikut.

- Hosted login memakai proof membership Noir/UltraHonk lokal dan verifier server dengan verification key yang dipin.
- Circuit memiliki uji eksplisit bahwa perubahan `normalized_origin_hash` menghasilkan `private_app_id` berbeda.
- Ada pemeriksaan konfigurasi aman: `npm run env:validate` dan `GET /api/health`. Keduanya hanya mengembalikan nama pemeriksaan atau kode masalah, bukan URL, wallet, atau secret.
- Script `.mjs`, `.js`, `.ts`, dan `.sh` dinormalisasi ke LF melalui `.gitattributes`, sehingga helper Noir/WSL tidak lagi mendapat error `pipefail\r` pada clone baru Linux/WSL.
- Dashboard tidak lagi menyebut transaksi on-chain sebagai “simulate”; tombol menyatakan bahwa Freighter akan diminta menyetujui transaksi Testnet.
- Developer docs dan README diperbarui agar membedakan proof nyata dari endpoint `POST /api/proof/simulate` yang hanya fixture non-production.
- Workflow tag `v*` membuat arsip SDK/server/shared yang immutable pada GitHub Release setelah `pack:check` lulus. Workflow ini sengaja **tidak** menerbitkan ke npm karena akun npm/token dan keputusan versi publik harus dimiliki operator.

Langkah di bawah adalah pekerjaan yang tidak dapat dijalankan aman dari checkout ini karena memerlukan akses atau otorisasi yang tidak ada: memperbaiki database deployment, menandatangani perubahan root dengan pemilik gate, mengubah environment/domain Vercel, memasang trustline Freighter, dan merekam video review.

## 0. Persiapan aman

Jalankan seluruh perintah dari folder `frontend`:

```powershell
cd D:\Work\00\veilpass\frontend
npm ci
npm run env:validate
```

`env:validate` wajib selesai tanpa baris `FAIL` sebelum live enrollment atau deployment. Tool itu dirancang tidak menampilkan nilai variabel. Jika gagal, perbaiki hanya variabel yang namanya disebutkan; jangan pernah menempelkan `.env.local`, connection string database, issuer secret, atau owner secret pada tiket publik/chat.

Setelah konfigurasi dipasang pada environment yang benar, cek endpoint deployment:

```powershell
Invoke-RestMethod https://<LOGIN_ORIGIN>/api/health
```

Kriteria lulus adalah HTTP `200`, `ok: true`, dan `issues: []`. HTTP `503` adalah kondisi aman/fail-closed; gunakan array `issues` untuk menentukan konfigurasi yang belum lengkap tanpa membocorkan nilainya.

## 1. Pulihkan storage durable dan jalankan migrasi

### Mengapa ini wajib

Login challenge, login nullifier, enrollment challenge, credential, dan Merkle tree tidak boleh hanya berada di memory pada deployment. Tanpa PostgreSQL yang valid, restart instance dapat menghapus catatan anti-replay dan root lokal tidak dapat disinkronkan dengan root Soroban.

### Tahapan

1. Buat database PostgreSQL kosong yang khusus untuk lingkungan Testnet VeilPass dan user database dengan hak minimum untuk schema aplikasi.
2. Bentuk `DATABASE_URL` dengan skema `postgresql://` atau `postgres://`, host, user, dan nama database yang nyata. Simpan hanya pada secret manager/Vercel environment; jangan pada git.
3. Pasang nilai itu untuk lingkungan yang akan dipakai hosted login (Preview bila ingin dry run, lalu Production).
4. Dari terminal operator yang memiliki URL tersebut, jalankan:

   ```powershell
   cd D:\Work\00\veilpass\frontend
   npm run db:migrate
   npm run env:validate
   ```

5. Pastikan `GET /api/health` menunjukkan database valid setelah deploy ulang.
6. Lakukan restart/deploy ulang lalu ulangi satu login; challenge yang sudah digunakan harus tetap ditolak sebagai `CHALLENGE_SPENT` dan nullifier yang sama sebagai replay.

### Bukti yang disimpan

- Output migrasi yang sudah disensor (nama migrasi dan status saja).
- Respons health tanpa nilai environment.
- Screenshot atau rekaman dua percobaan login dengan challenge/nullifier sama dan error aman.

## 2. Inisialisasi root credential Testnet dengan pemilik gate

### Mengapa ini wajib

Gate Testnet `premium-holder` yang diaudit ada pada epoch 1 dengan root non-zero. Database deployment saat ini belum dapat dibuktikan memiliki tree yang sama. Jika root lokal dan root on-chain berbeda, enrollment harus gagal agar witness tidak diterbitkan terhadap state yang salah.

### Otorisasi yang diperlukan

Gunakan **hanya** akun Stellar yang tercatat sebagai owner gate. Secret tersebut disimpan sebagai `VEILPASS_GATE_OWNER_SECRET` pada service operator—bukan di browser, bukan di host dApp, dan bukan dalam repository. Secret issuer berbeda fungsi dan tidak menggantikan owner gate.

### Pilihan aman

Pilih satu, dokumentasikan pilihan tersebut, lalu jangan campur keduanya.

1. **Reset state Testnet baru (direkomendasikan jika tidak ada credential yang harus dipertahankan):** putar epoch dari 1 ke 2 dengan root Merkle kosong kanonis (field nol 32 byte). Rotasi epoch membuat identifier privat lama tidak berlaku sebagai identifier di epoch baru, sehingga tidak ada klaim kompatibilitas palsu dengan state lama.
2. **Lanjutkan state lama:** impor/export state tree yang persis menghasilkan root on-chain saat ini, verifikasi root secara deterministik, lalu gunakan state tersebut pada database durable. Jangan melakukan ini bila tidak ada backup state dan prosedur reproduksinya.

Untuk pilihan reset, operator membuka dashboard, memeriksa contract ID/gate ID/epoch, memasukkan root nol, lalu memilih **Rotate epoch with Freighter**. Freighter harus memperlihatkan transaksi Stellar Testnet yang ditandatangani owner. Simpan hash transaksi dan query ulang gate sesudah final.

Untuk otomatisasi service, baru pasang `VEILPASS_GATE_OWNER_SECRET` pada environment server setelah operator memverifikasi account owner dan kebijakan akses secret. Jangan pernah menambahkan prefiks `NEXT_PUBLIC_`.

### Kriteria lulus

- Contract menunjukkan root dan epoch yang diharapkan.
- Database tree kosong yang baru menghasilkan root yang sama, atau tree lama yang dipulihkan terbukti menghasilkan root yang sama.
- Enrollment pertama berhasil mempublikasikan root baru dan witness yang diterbitkan bisa diverifikasi pada root itu.
- `npm run contract:smoke` masih lulus setelah perubahan.

## 3. Siapkan aset dan enrollment Freighter

1. Pada Freighter, pilih **Stellar Testnet** dan gunakan account Testnet terpisah untuk demo.
2. Tambahkan trustline terhadap code dan issuer aset gate yang dikonfigurasi.
3. Dari terminal yang memiliki issuer secret **lokal dan aman**, kirim aset minimum:

   ```powershell
   cd D:\Work\00\veilpass\frontend
   npm run asset:issue -- <FREIGHTER_TESTNET_PUBLIC_KEY>
   ```

4. Buka `/dashboard/enroll`, baca disclosure issuer, lalu setujui signature challenge Freighter.
5. Pastikan UI menyebut bahwa issuer dapat melihat wallet saat enrollment; host dApp tidak boleh menerima wallet itu pada hasil login.
6. Setelah credential dibuat, refresh witness dan lakukan login normal ke App A.

Jika transaksi gagal, simpan code transaksi Stellar dan public account yang digunakan, tetapi jangan simpan seed phrase atau secret key dalam laporan.

## 4. Perbaiki topologi origin dan environment Vercel

### Kondisi yang harus dicapai

Hosted-login origin harus benar-benar tersedia, HTTPS, dan sama persis pada konfigurasi publik dan server. Host A dan Host B harus memiliki origin berbeda untuk membuktikan domain separation.

| Peran | Contoh | Variabel yang harus konsisten |
| --- | --- | --- |
| Hosted login | `https://login.example.test` | `VEILPASS_LOGIN_ORIGIN`, `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` |
| Host App A | `https://app-a.example.test` | `VEILPASS_HOST_ORIGIN` untuk deployment Host A / origin challenge yang dipercaya |
| Host App B | `https://app-b.example.test` | origin challenge yang dipercaya untuk deployment Host B |
| Backend service | origin login atau API yang relevan | `DATABASE_URL`, issuer secret, owner secret, contract/asset config |

### Tahapan

1. Buat/claim tiga domain HTTPS atau gunakan subdomain yang jelas untuk login, App A, dan App B.
2. Pada Vercel, pastikan project/root directory benar (`frontend`) dan setiap domain diarahkan pada deployment yang meng-host route yang dibutuhkan.
3. Pasang environment variables per environment. Nilai `VEILPASS_LOGIN_ORIGIN` dan `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` harus merepresentasikan satu origin login yang identik; jangan menyertakan path, query, fragment, atau slash ganda.
4. Konfigurasikan host challenge supaya Origin App A dan App B yang diizinkan sesuai topologi. Jangan menggunakan wildcard untuk origin popup/postMessage.
5. Deploy ulang. Cek:

   ```powershell
   Invoke-WebRequest https://<LOGIN_ORIGIN>/login -Method Head
   Invoke-RestMethod https://<LOGIN_ORIGIN>/api/health
   ```

6. Dari App A dan App B, panggil `POST /api/challenges` dengan Origin masing-masing. Keduanya harus mendapat challenge bila authorized; Origin asing harus tetap mendapat `ORIGIN_MISMATCH`/403.
7. Pastikan `/demo` tetap memberi label “Simulated proof” untuk fixture; jangan gunakan halaman itu sebagai bukti acceptance proof nyata.

## 5. Jalankan acceptance end-to-end dan kumpulkan bukti

Gunakan credential yang sama dan challenge yang baru untuk setiap kasus. Catat request ID, gate, origin, epoch, outcome, dan hash transaksi; jangan catat wallet, proof bytes, subject secret, nullifier, atau challenge mentah.

| Kasus | Cara | Hasil wajib |
| --- | --- | --- |
| Login valid App A | Enroll lalu login dari App A | `ok`, private app ID, gate, epoch, expiry; tanpa wallet address |
| Login ulang App A | Challenge baru, credential sama | private app ID sama selama epoch sama |
| App B | Login credential sama dari origin App B | private app ID berbeda dari App A |
| Replay challenge | Kirim proof result sama dua kali | percobaan kedua `CHALLENGE_SPENT` |
| Replay nullifier | Gunakan nullifier sama pada challenge lain | ditolak sebagai replay/nullifier spent |
| Expiry | Gunakan credential/proof/challenge yang kedaluwarsa | error expiry yang aman |
| Revocation | Revoke hash melalui owner, lalu login | `CREDENTIAL_REVOKED` |
| Epoch stale | Rotate epoch lalu pakai credential lama | `STALE_EPOCH` atau flow refresh/re-enroll yang aman |

Setelah acceptance, simpan screenshot respons yang sudah disensor dan hash transaksi revocation/epoch update dalam `frontend/docs/evidence/`. Jangan menaruh screenshot seed phrase, popup Freighter berisi informasi sensitif, atau nilai `.env`.

## 6. Jalankan quality gate sebelum merge/release

```powershell
cd D:\Work\00\veilpass\frontend
npm run lint
npm run typecheck
npm test
npm run contract:test
npm run proof:runtime
npm run proof:check
npm run pack:check
npm run test:e2e
npm run build
```

Pada Windows, `proof:check` perlu WSL dengan toolchain Noir/Barretenberg yang dipin. Karena `.gitattributes` kini memaksa LF untuk helper shell/toolchain, lakukan fresh checkout atau normalisasi index setelah perubahan ini sebelum mengevaluasi error line-ending lama.

Untuk rilis artefak SDK/server/shared, push tag yang sudah direview, misalnya `v0.2.0-testnet`. Workflow `Release packages` akan membuat `.tgz` dan `SHA256SUMS` pada GitHub Release. Publikasi npm dilakukan **hanya** bila operator memutuskan package siap didistribusikan dan mengonfigurasi token/2FA release secara terpisah.

## 7. Video review singkat

Rekam 3–5 menit dengan urutan ini:

1. Jelaskan batas privasi: issuer melihat wallet saat enrollment, host tidak.
2. Tunjukkan gate Testnet, epoch, dan hash transaksi tanpa secret.
3. Enroll Freighter di Testnet dan jelaskan trustline aset.
4. Login ke App A dua kali, lalu App B sekali; bandingkan private app ID.
5. Perlihatkan penolakan replay, expiry, dan revocation.
6. Akhiri di docs/audit dan sebutkan out-of-scope: tidak ada private payments, mainnet, browser extension pengganti, atau anonimitas IP/fingerprint.

## Batas otorisasi yang sengaja tidak diotomatisasi

Tidak ada script repository yang boleh mengambil alih tindakan berikut tanpa operator yang berwenang:

- Memperbaiki atau membuat database produksi dan membaca/menulis secret database.
- Memasukkan owner/issuer secret ke Vercel atau key vault.
- Menandatangani transaksi root/epoch/revocation owner pada Stellar Testnet.
- Menambah trustline atau menyetujui signature Freighter milik pengguna.
- Mengubah DNS, Vercel project, environment production, atau domain origin.
- Mempublikasikan package npm atau membuat klaim audit/mainnet.

Itu bukan kekurangan kode; itu pemisahan tanggung jawab yang diperlukan supaya aplikasi tidak menyimpan atau mengoperasikan wallet/secret pengguna secara tidak sah.
