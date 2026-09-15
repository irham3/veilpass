# VeilPass — Release dan Konfigurasi Cloud Runbook

**Tanggal pemeriksaan:** 14 September 2026
**Tujuan:** menutup gap konfigurasi untuk Deliverable 1–3 tanpa mengungkap seed, password, token, atau data wallet.

Dokumen ini adalah status aktual dan prosedur operasional. Ia melengkapi, bukan menimpa, audit deliverable terdahulu. Semua perintah di bawah dijalankan dari komputer pengembang; jangan menempelkan nilai rahasia ke chat, Git, issue, atau README.

## 1. Status terverifikasi saat ini

| Area | Status | Bukti / catatan |
| --- | --- | --- |
| Kontrak gate Soroban Testnet | Selesai dan dapat dibaca | Contract ID `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`; smoke test Testnet lulus. |
| Owner kontrak | Selesai | Public owner `GDVP7QVOCQ4L4CDNXVWD53ATXGYDXTDOYVFPJ3UA5OTWJW7XGXSNFXRJ`; seed owner tidak dicatat di dokumen ini. |
| Env Vercel inti | Selesai | Kontrak, public source account, root, network/RPC, origin, dan owner secret sudah ada pada environment yang sesuai. |
| Deployment produksi | Selesai | `https://www.veilpass.dev/api/health` memberi HTTP 200 dan seluruh pemeriksaan konfigurasi bernilai `true`. |
| Artefak paket | Siap publish | `npm run pack:check` lulus pada 14 September 2026. |
| Publikasi npm | Selesai | `@veilpass/shared@0.1.0`, `@veilpass/sdk@0.1.0`, dan `@veilpass/server@0.1.0` telah diterbitkan public pada 15 September 2026; instalasi bersih dan import ESM ketiganya lulus. |
| Workflow release GitHub | Trusted Publishing aktif | Workflow membangun, memeriksa, publish dengan npm provenance, membuat `.tgz`, dan membuat GitHub Release. Pemilik akun mengonfirmasi Trusted Publisher npm telah diaktifkan untuk ketiga package pada 15 September 2026. |
| Neon schema | Selesai | Pada 15 September 2026, Drizzle menjalankan migration `0000`, `0001`, dan `0002` ke Neon. Query schema mengonfirmasi seluruh delapan tabel `veilpass` tersedia. |
| Demo dua dApp independen | Domain/origin selesai; wallet acceptance tertunda | `login.veilpass.dev`, `app-a.veilpass.dev`, dan `app-b.veilpass.dev` telah dipasang dan terverifikasi pada project Vercel. Rewrites aplikasi memetakan root App A/B ke host demo masing-masing. |
| Uji wallet end-to-end | Menunggu wallet testnet | Freighter memerlukan persetujuan langsung pemegang wallet; ini tidak bisa dan tidak boleh diautomasi oleh agent. |
| Video review | Belum | Direkam setelah jalur login App A/B, replay, expiry, dan revocation lolos pada deployment publik. |

### Pembaruan implementasi 15 September 2026

- Neon migration berhasil dijalankan melalui Drizzle terhadap `ep-odd-dream-b3la9b8x-pooler.c-4.ap-southeast-1.aws.neon.tech` tanpa menampilkan connection string.
- Schema `veilpass` telah memiliki `contract_sync_cursors`, `credential_merkle_credentials`, `credential_tree_nodes`, `demo_sessions`, `enrollment_challenges`, `issuer_credentials`, `login_challenges`, dan `login_nullifiers`.
- Vercel telah memverifikasi `login.veilpass.dev`, `app-a.veilpass.dev`, dan `app-b.veilpass.dev`. Parent domain memakai nameserver Vercel, jadi tidak perlu menambahkan record secara manual pada Spaceship untuk tiga subdomain tersebut.
- Environment production dan preview sekarang mengarahkan hosted login ke `https://login.veilpass.dev` dan menerima exact-host allowlist `https://app-a.veilpass.dev,https://app-b.veilpass.dev`.
- Setelah deployment `dpl_APSdzxf2dCM9hVpTfjwFF97zYKvz` berstatus Ready, `GET https://login.veilpass.dev/api/health` mengembalikan `ok: true`; root App A dan App B mengembalikan HTTP 200 serta UI host yang benar.
- Acceptance request langsung ke `/api/challenges` menghasilkan origin `https://app-a.veilpass.dev` untuk App A dan `https://app-b.veilpass.dev` untuk App B. Kedua origin berbeda dan keduanya lolos allowlist.
- npm public release selesai: [shared](https://www.npmjs.com/package/@veilpass/shared), [sdk](https://www.npmjs.com/package/@veilpass/sdk), dan [server](https://www.npmjs.com/package/@veilpass/server) semuanya berada pada version `0.1.0` dengan dist-tag `latest`.
- Smoke install dalam folder baru di luar repository memasang ketiga package dari registry, menemukan nol vulnerability, dan menjalankan import ESM untuk ketiganya dengan hasil `PUBLIC_NPM_IMPORTS=PASS`.
- Trusted Publisher npm untuk `@veilpass/shared`, `@veilpass/sdk`, dan `@veilpass/server` telah diaktifkan oleh owner. Workflow GitHub `release-packages.yml` sekarang dapat memperoleh identity token OIDC untuk rilis versi berikutnya tanpa `NPM_TOKEN` permanen.

### Bukti kontrak Testnet

- Deploy transaksi: [Stellar Expert](https://stellar.expert/explorer/testnet/tx/ebefe9c2aa18361e58dc1defac11fe346840d62efee2b3c4ac0c35c3544af3cb)
- Inisialisasi gate: [Stellar Expert](https://stellar.expert/explorer/testnet/tx/c7b420f20f0167c47340259f7afb060040ac06b9f40303163ae2da8c79620558)
- Gate: `premium-holder`; epoch `1`; credential root awal adalah 64 karakter `0`.

## 2. Batas kemampuan: apa yang bisa dikerjakan agent dan apa yang harus dilakukan pemilik akun

### Dapat dikerjakan agent setelah prasyarat tersedia

1. Menjalankan `npm run pack:check`, mengecek isi tarball, menambahkan workflow trusted publishing, membuat commit, dan push.
2. Menjalankan migration Drizzle setelah `DATABASE_URL` Neon yang valid tersedia di environment lokal/terhubung.
3. Menyetel atau memperbaiki variable environment Vercel, redeploy, dan menguji health endpoint.
4. Menerbitkan aset Testnet atau menjalankan smoke test setelah hanya **public Stellar address** wallet penerima diberikan.
5. Mengonfigurasi kode/origin allowlist dan melakukan acceptance test setelah domain benar-benar terhubung.

### Harus dilakukan pemilik akun atau memerlukan persetujuan eksplisit di UI

1. Login npm, membuat atau memiliki scope `@veilpass`, dan menyelesaikan 2FA/OTP. Password, recovery code, token, dan OTP tidak boleh diberikan ke agent.
2. Mengonfirmasi kepemilikan domain serta menambahkan DNS record pada registrar. Ini mengubah infrastruktur eksternal.
3. Login Neon bila sesi belum ada dan memilih project/branch database yang benar. Jangan membagikan connection string berisi password di chat.
4. Menyetujui popup Freighter untuk proof/signature/transaction. Tidak ada pihak lain yang boleh mengambil alih wallet.
5. Memasukkan OTP authenticator ke terminal lokal saat publish awal. OTP tidak boleh dikirim ke agent atau chat.

### Tentang MCP

OAuth Vercel dan Neon pernah disambungkan pada konfigurasi Codex, tetapi tool MCP Neon/Vercel tidak diekspos sebagai tool panggilan pada task ini. Konfigurasi Vercel tetap sudah dapat dikerjakan melalui CLI resmi dan telah diterapkan. MCP tidak menggantikan login, ownership, 2FA, atau konfirmasi wallet. Jika ingin memakai Neon MCP secara langsung, buat task Codex baru setelah login OAuth selesai dengan prompt: `Gunakan Neon MCP untuk project VeilPass. Periksa schema secara read-only lalu jalankan migration Drizzle di frontend/drizzle saja; jangan ubah database lain.`

## 3. Publish npm — prosedur yang direkomendasikan

Paket yang akan dipublikasikan secara berurutan adalah:

1. `@veilpass/shared@0.1.0`
2. `@veilpass/sdk@0.1.0`
3. `@veilpass/server@0.1.0`

Urutan penting karena SDK dan server bergantung pada `@veilpass/shared`.

> **Catatan permanen:** kombinasi nama paket dan versi tidak dapat dipakai ulang setelah dipublish. Jangan menerbitkan `0.1.0` bila rilis ini belum siap untuk publik; naikkan versi terlebih dahulu bila perlu.

### 3.1 Pilih dan klaim scope npm

Nama kode saat ini memakai scope `@veilpass`. Karena itu, scope tersebut harus dimiliki oleh akun npm pengguna atau organisasi npm `veilpass`.

1. Buka [npmjs.com](https://www.npmjs.com/) lalu pilih **Sign Up** atau **Sign In**.
2. Setelah masuk, klik avatar kanan atas → **Profile** → **Two-Factor Authentication** → **Enable 2FA**.
3. Pilih mode yang mengharuskan 2FA untuk publish/write, scan QR dengan authenticator, masukkan kode verifikasi, lalu simpan recovery codes di password manager/offline vault.
4. Untuk mempertahankan nama `@veilpass`, klik avatar → **Organizations** → **Create an Organization**.
5. Isi nama organisasi `veilpass` bila masih tersedia. Pilih plan public/free yang sesuai untuk paket public. Selesaikan verifikasi yang diminta npm.
6. Pada halaman organization, buka **Members** dan pastikan akun yang dipakai mempunyai peran **Owner** atau memiliki izin write untuk packages.

Jika `veilpass` sudah diambil pihak lain, **jangan memaksa publish**. Pilih scope yang memang dimiliki, misalnya `@irham3`, lalu minta perubahan nama paket di kode terlebih dahulu. Mengganti scope menyentuh `package.json`, dependency internal, contoh README, dan dokumentasi instalasi sehingga harus dilakukan sebagai perubahan kode terpisah.

### 3.2 Pemeriksaan sebelum publish

Di PowerShell, jalankan:

```powershell
cd D:\Work\00\veilpass\frontend
npm login
npm whoami
npm run pack:check
npm pack --workspace @veilpass/shared --dry-run
npm pack --workspace @veilpass/sdk --dry-run
npm pack --workspace @veilpass/server --dry-run
```

Saat `npm login`, ikuti browser/device authorization bila ditawarkan npm. Jangan mengirim password atau OTP ke chat. `npm whoami` harus menampilkan username npm; jika masih `ENEEDAUTH`, berhenti dan ulangi login.

Periksa setiap daftar file dari `npm pack --dry-run`. Paket boleh berisi `dist`, `README.md`, dan `LICENSE`; paket tidak boleh memuat `.env*`, credential, seed `S...`, database URL, `node_modules`, atau file build aplikasi yang tidak relevan.

### 3.3 Publish manual satu kali (aksi permanen)

Setelah scope/2FA valid dan pemeriksaan lulus, jalankan tepat dalam urutan ini:

```powershell
cd D:\Work\00\veilpass\frontend
npm publish --workspace @veilpass/shared --access public --provenance=false
npm publish --workspace @veilpass/sdk --access public --provenance=false
npm publish --workspace @veilpass/server --access public --provenance=false
```

CLI akan meminta OTP dari authenticator untuk setiap publish. Isi hanya ke prompt lokal. Jangan memakai `--otp=<kode>` atau mengirim OTP ke chat karena berisiko tersimpan di history/log. Opsi `--provenance=false` hanya dipakai untuk rilis awal dari mesin lokal; provenance otomatis harus dilakukan dari GitHub Actions Trusted Publishing pada rilis berikutnya.

Lalu verifikasi registry dan instalasi bersih:

```powershell
npm view @veilpass/shared version
npm view @veilpass/sdk version
npm view @veilpass/server version
$testDir = Join-Path $env:TEMP 'veilpass-npm-smoke'
New-Item -ItemType Directory -Force -Path $testDir | Out-Null
Set-Location $testDir
npm init -y
npm install @veilpass/sdk@0.1.0
node -e "import('@veilpass/sdk').then(() => console.log('SDK import OK'))"
```

Setelah selesai, hapus folder test manual melalui File Explorer bila ingin membersihkan mesin. Jangan mempublikasikan ulang versi yang sama jika ada satu paket gagal; lihat versi yang sudah live, naikkan semua versi secara konsisten, lalu ulangi rilis dengan tag baru.

### 3.4 Otomasi GitHub yang lebih aman: npm Trusted Publishing

Ini adalah opsi jangka panjang yang direkomendasikan karena GitHub Actions tidak menyimpan `NPM_TOKEN`. Ia dilakukan **setelah package pertama tersedia** di npm.

1. Pastikan workflow publish berada di repository `irham3/veilpass` dan file berada pada `.github/workflows/`. File yang sekarang ada: `release-packages.yml`.
2. Pada npmjs.com buka halaman package, contoh `@veilpass/sdk` → **Settings** → bagian **Trusted Publisher** → **Configure** / **Add Trusted Publisher**.
3. Pilih **GitHub Actions**.
4. Isi persis:

   | Field npm | Nilai |
   | --- | --- |
   | Organization or user | `irham3` |
   | Repository | `veilpass` |
   | Workflow filename | `release-packages.yml` |
   | Environment name | kosong, kecuali GitHub Environment memang ditambahkan |
   | Allowed action | izinkan direct `npm publish` untuk workflow release yang sudah direview |

5. Ulangi konfigurasi Trusted Publisher untuk `@veilpass/shared`, `@veilpass/sdk`, dan `@veilpass/server`.
6. Setelah itu, agent dapat mengubah workflow agar menambahkan permission `id-token: write` dan menjalankan tiga publish command pada tag semver. Jangan simpan legacy `NPM_TOKEN` di GitHub Secrets kecuali ada alasan operasional yang kuat.
7. Buat tag baru yang sesuai dengan versi, push tag, lihat **GitHub repository → Actions → Release packages**, lalu verifikasi provenance di halaman npm.

> **Catatan tooling:** pada npm `11.6.2` yang dipin di repository ini, perintah `npm stage publish` belum tersedia. Jangan menjadikan staged publishing sebagai langkah rilis sampai CLI resmi di-upgrade dan diverifikasi kembali.

Dokumentasi resmi: [public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/) dan [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/).

## 4. Neon PostgreSQL — menjalankan migration dengan aman

Migration aplikasi ada di:

- `frontend/drizzle/0000_veilpass_mvp.sql`
- `frontend/drizzle/0001_enrollment_challenge_gate.sql`
- `frontend/drizzle/0002_credential_merkle_tree.sql`

Migration ini membuat schema PostgreSQL `veilpass`, tabel challenge/nullifier/session/credential, serta tree Merkle. Ia tidak menyentuh schema aplikasi lain.

### Opsi A — Neon Console (paling jelas bila MCP tidak muncul)

1. Buka [Neon Console](https://console.neon.tech/) dan login dengan akun yang memiliki project VeilPass.
2. Pada daftar project, pilih project yang terhubung ke Vercel VeilPass. Jangan memilih project lain hanya karena namanya mirip.
3. Pada sidebar pilih **Branches**. Pilih branch produksi yang benar (biasanya `main` atau `production`).
4. Klik **SQL Editor** → **New query**.
5. Dari repository lokal, buka ketiga file migration di atas. Salin isi **secara berurutan**: `0000`, lalu `0001`, lalu `0002`; klik **Run** setiap file dan pastikan hasilnya sukses sebelum lanjut.
6. Jalankan query read-only berikut di editor untuk bukti:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'veilpass'
ORDER BY table_name;
```

Hasil seharusnya memuat minimal `login_challenges`, `login_nullifiers`, `enrollment_challenges`, `issuer_credentials`, `credential_merkle_credentials`, `credential_tree_nodes`, `demo_sessions`, dan `contract_sync_cursors`.
7. Simpan screenshot hasil query sebagai bukti Deliverable 2/3, tanpa menampilkan connection string.

### Opsi B — Drizzle CLI dari repository (direkomendasikan setelah koneksi lokal valid)

1. Neon Console → project yang benar → branch yang benar → tombol **Connect**.
2. Pilih connection string PostgreSQL untuk aplikasi/server. Salin nilai `postgresql://...` ke clipboard lokal. Nilai ini rahasia karena mengandung password.
3. Buka `D:\Work\00\veilpass\frontend\.env.local` dengan editor lokal dan ubah/tambahkan satu baris:

```dotenv
DATABASE_URL=postgresql://...nilai-dari-Neon-Connect...
```

4. Simpan file. Pastikan `.env.local` tetap di-ignore Git. Jangan paste baris tersebut ke chat atau commit.
5. Di PowerShell:

```powershell
cd D:\Work\00\veilpass\frontend
npm run db:migrate
```

6. Bila selesai, jalankan acceptance query pada opsi A atau start aplikasi lalu buka `https://www.veilpass.dev/api/health` untuk memastikan konfigurasi aplikasi tetap valid.

Jika muncul `password authentication failed`, sumber masalahnya adalah connection string, branch, atau password Neon; ambil connection string baru dari menu **Connect**. Jangan mencoba berkali-kali memakai password yang salah.

## 5. Domain dan arsitektur dua dApp (Deliverable 3)

### Topologi yang direkomendasikan

| Fungsi | Exact origin | Vercel project | Rahasia yang boleh ada |
| --- | --- | --- | --- |
| Hosted login / issuer | `https://login.veilpass.dev` | `veilpass` — route `/login` | issuer secret, gate owner secret, database URL, root; server-only |
| Demo App A | `https://app-a.veilpass.dev` | `veilpass` — rewrite `/` ke `/host/app-a` | public SDK/login-origin; host cannot read server environment |
| Demo App B | `https://app-b.veilpass.dev` | `veilpass` — rewrite `/` ke `/host/app-b` | public SDK/login-origin; host cannot read server environment |

`www.veilpass.dev` dapat tetap menjadi landing page atau redirect ke `login.veilpass.dev`. Exact origin berbeda adalah inti pengujian domain separation: ID privat untuk App A tidak boleh sama dengan App B, walau wallet/credential yang digunakan sama.

### 5.1 Tambahkan domain di Vercel lebih dulu

Lakukan satu per satu untuk tiap project yang benar.

1. Buka [Vercel Dashboard](https://vercel.com/dashboard) → pilih team `my-team-11d97e25` → buka project yang dituju.
2. Klik **Settings** → **Domains**.
3. Isi domain, contoh `login.veilpass.dev`, lalu klik **Add**.
4. Vercel akan menampilkan DNS record yang diperlukan. Salin **type, host/name, dan value persis dari Vercel**. Jangan memakai value dari contoh internet bila dashboard memberi nilai berbeda.
5. Biarkan halaman ini terbuka sampai DNS dipasang.

### 5.2 Pasang DNS di Spaceship (hanya bila nameserver bukan Vercel)

Untuk implementasi saat ini langkah ini **sudah tidak diperlukan**: `veilpass.dev` telah memakai `ns1.vercel-dns.com` dan `ns2.vercel-dns.com`; Vercel otomatis mengelola subdomain yang telah ditambahkan. Gunakan prosedur berikut hanya bila nameserver dipindah dari Vercel di masa depan.

1. Buka Spaceship → **Domain List** → klik `veilpass.dev` → **Manage**.
2. Cari menu **DNS**, **DNS Records**, atau **Manage DNS**.
3. Klik **Add record**.
4. Masukkan type, host, dan destination/value persis yang Vercel tampilkan untuk subdomain tadi. Untuk banyak konfigurasi Vercel ini berbentuk `CNAME`, host `login` (atau `app-a`/`app-b`), tetapi dashboard Vercel tetap adalah sumber otoritatif.
5. TTL: pilih default/Automatic kecuali Vercel meminta nilai tertentu.
6. Klik **Save**.
7. Kembali ke Vercel Settings → Domains dan klik **Refresh** / tunggu status menjadi **Valid Configuration**. DNS propagation dapat memerlukan beberapa menit hingga lebih lama.

### 5.3 Environment per project

Di Vercel: Project → **Settings** → **Environment Variables** → **Add New**. Untuk setiap nilai pilih target environment **Production** dan **Preview** sesuai tabel.

| Project | Key | Value | Type |
| --- | --- | --- | --- |
| `veilpass-login` | `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` | `https://login.veilpass.dev` | Plain/Config |
| `veilpass-login` | `VEILPASS_LOGIN_ORIGIN` | `https://login.veilpass.dev` | Secret |
| `veilpass-login` | `VEILPASS_HOST_ORIGIN` | `https://app-a.veilpass.dev,https://app-b.veilpass.dev` | Secret |
| `veilpass-login` | contract ID, source account, RPC, network | nilai Testnet yang telah divalidasi | public config sesuai nama key |
| `veilpass-login` | `VEILPASS_GATE_OWNER_SECRET`, issuer secret, `DATABASE_URL`, credential root | nilai rahasia yang telah ada | Secret |
| `veilpass-app-a` | `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` | `https://login.veilpass.dev` | Plain/Config |
| `veilpass-app-b` | `NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN` | `https://login.veilpass.dev` | Plain/Config |

Setelah setiap perubahan environment, buka tab **Deployments**, klik menu `...` pada deployment terakhir, lalu pilih **Redeploy** agar build menerima nilai baru. Jangan menyalin `VEILPASS_GATE_OWNER_SECRET` atau issuer secret ke App A/B; host dApp tidak boleh memegang credential issuer.

> Implementasi kini memakai satu deployment dengan tiga HTTPS exact origin dan dua host-route terpisah. Ini memenuhi pembuktian browser-level domain separation: browser, popup channel, challenge, proof public input, dan verifier tetap terikat ke `app-a` atau `app-b`. Untuk hardening produksi setelah MVP, pecah hosted-login dan dua host menjadi project/deployment Vercel terpisah agar secret blast radius lebih kecil.

## 6. Wallet, asset eligibility, dan acceptance test publik

1. Di browser pengguna, instal/buka **Freighter** dan pilih network **Testnet**.
2. Buat atau pilih wallet Testnet. Salin hanya public address yang diawali `G`; seed yang diawali `S` tidak pernah dibagikan.
3. Dapatkan test XLM dari Stellar Friendbot bila akun belum aktif, lalu tambahkan trustline asset demo bila flow aplikasi meminta.
4. Berikan public `G...` address kepada operator. Operator dapat menjalankan `npm run asset:issue -- <G_PUBLIC_ADDRESS>` dari environment yang menyimpan issuer secret; pemilik wallet kemudian melihat asset/balance pada Freighter.
5. Buka App A → klik **Sign in with VeilPass** → popup login → pilih/approve Freighter → enrollment bila belum ada → login.
6. Catat `privateAppId`, `gate`, `epoch`, `expiry`, dan hasil eligibility. Pastikan response host tidak memuat Stellar address.
7. Login ulang di App A. Pastikan `privateAppId` stabil untuk App A.
8. Login di App B dengan credential/wallet sama. Pastikan `privateAppId` App B berbeda dari App A.
9. Coba submit ulang proof/challenge yang sama. Harus ditolak sebagai replay/nullifier spent.
10. Uji expiry dengan menunggu/melewati TTL challenge atau memakai fixture/clock test yang terdokumentasi. Harus ditolak expired.
11. Revoke commitment di gate dashboard/operator flow, lalu coba login ulang. Harus ditolak revoked.
12. Rekam layar singkat yang menunjukkan success, repeat login, cross-domain difference, replay rejection, expiry rejection, dan revocation rejection. Sensor public wallet address bila tidak ingin ditampilkan.

## 7. Urutan tindakan paling efisien

1. **Pemilik akun:** klaim/konfirmasi scope npm `@veilpass` dan aktifkan 2FA.
2. **Agent:** setelah login npm selesai di mesin ini, lakukan preflight dan publish tiga paket dalam urutan dependency di atas atau siapkan trusted-publishing workflow.
3. **Pemilik akun:** login Neon dan ambil connection string langsung ke `.env.local`, atau buka task baru dengan Neon MCP.
4. **Agent:** jalankan `npm run db:migrate`, verifikasi schema, dan simpan bukti non-rahasia.
5. **Agent:** deploy rewrite host App A/B dan uji ketiga domain publik.
6. **Pemilik wallet:** approve Freighter Testnet; **agent:** terbitkan asset dan jalankan scripted acceptance checks.
7. **Tim:** rekam video, kumpulkan screenshots/URLs, dan perbarui test report / developer quickstart.

Dengan urutan ini, pekerjaan yang tertahan hanya berada pada aksi yang secara sengaja membutuhkan identitas/2FA/approval pemilik akun. Semua pengerjaan kode, publish command setelah login, deployment validation, migration execution, dan bukti teknis dapat diambil alih agent segera setelah prasyaratnya tersedia.
