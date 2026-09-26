# VeilPass: panduan demo lengkap dan gerbang rilis developer

**Tanggal:** 26 September 2026
**Lingkungan:** Stellar Testnet; `https://veilpass.dev`, `https://login.veilpass.dev`, `https://app-a.veilpass.dev`, `https://app-b.veilpass.dev`.  
**Status panduan:** enrollment live dengan Freighter sudah selesai; login App A dua kali dan App B sekali sudah sukses pada Chrome yang sama. App A mempertahankan private ID di dua sesi dan App B menghasilkan private ID berbeda. Jangan merekam atau menyalin private ID/proof mentah. Tiga package npm `0.2.0` telah diterbitkan manual tanpa provenance dan lulus smoke install/import. GitHub master sudah memuat README `0.2.1`; tag workflow melewati `pack:check` dan gagal pada publish pertama (`@veilpass/shared@0.2.1`) dengan HTTP 403 `OIDC permission denied for this action`. SDK/server belum dicoba publish dan GitHub Release assets belum dibuat. Halaman npm tetap di `0.2.0` sampai npm owner mengotorisasi direct publish untuk Trusted Publisher yang benar dan workflow direrun.

**Gerbang rilis saat panduan ini diperbarui:** support reference lama `af2f4b9d-34f5-47a8-b371-84c8b894ed10` berasal dari contract StrKey tidak valid dan ketidakcocokan root. Contract Production/Preview sudah dikoreksi ke `CDENQIJD2CJJPBW74JQWF35SPRFK53XPF6FFFBJTD2UYESHI6I7CHYEK`. Setelah login live mengungkap origin localhost dari SSR dan kegagalan inisialisasi CRS di Vercel, deployment [`dpl_D5pR6QWm7Ci1LWLCeN3y2W7MmmJe`](https://vercel.com/my-team-11d97e25/veilpass/D5pR6QWm7Ci1LWLCeN3y2W7MmmJe) memperbaiki keduanya dan READY. `/api/health`, automated production acceptance, dan verifikasi live `/api/verify` lulus. Pemilik wallet menyetujui akses wallet dan signature enrollment; credential tersimpan. Login App A dua kali dan App B satu kali berhasil. Replay/expiry/revocation, capture host tersensor, dan video masih belum diuji/direkam. Lihat gerbang dan batas status pada lembar acceptance di akhir dokumen sebelum menyebut demo siap untuk developer eksternal.

## 1. Pilih dua jalur presentasi dengan jelas

- **Jalur visual cepat:** `/demo` adalah simulasi lokal dengan ID dan error tetap. Pakai untuk menjelaskan konsep App A/App B, replay, dan revocation dalam 1 menit. Tulisan “Simulated proof” harus terlihat. Jalur ini **tidak** menjadi bukti proof, cookie, atau transaksi Testnet.
- **Jalur acceptance nyata:** enrollment pada `login.veilpass.dev`, lalu tombol **Login with VeilPass** di dua host HTTPS yang berbeda. Jalur ini memerlukan Freighter pengguna, XLM Testnet, database durable, konfigurasi issuer dan owner, root Merkle yang cocok, serta deployment dari commit yang hendak didemokan.

Urutan presentasi yang disarankan: konteks privasi → status gate → enrollment → App A pertama → App A kedua → App B → network/cookie → replay → expiry → revocation → dokumentasi integrasi → batas produk. Jangan mengubah epoch atau mencabut credential sebelum tiga login sukses direkam.

## 2. Prasyarat dan pemeriksaan sebelum penonton hadir

1. Gunakan Chrome/Chromium dengan Freighter terpasang dan tidak terkunci. Pilih **Stellar Testnet** dan satu account demo khusus. Jangan pernah memasukkan seed phrase ke situs, rekaman, terminal, atau repo. Account harus punya setidaknya minimum native XLM yang tertera di halaman enrollment; saldo juga harus menyisakan base reserve/fee Testnet.
2. Gunakan deployment yang memuat kode yang ingin dipresentasikan. Publikasi source, Vercel, dan npm adalah langkah terpisah. Jika deployment atau paket npm masih versi lama, nyatakan versi sebenarnya; build lokal tidak otomatis mengubah keduanya.
3. Di terminal `frontend/`, jalankan pemeriksaan lokal berikut secara berurutan. Hentikan presentasi live jika salah satu gerbang keamanan gagal.

   ```powershell
   npm ci
   npm run env:validate
   npm run lint
   npm run typecheck
   npm run test:coverage
   npm run test:coverage:all
   npm run contract:test
   npm run proof:check
   npm run pack:check
   npm run build
   npm run test:e2e
   npm run production:acceptance
   npm run contract:smoke
   ```

4. `GET https://login.veilpass.dev/api/health` harus HTTP 200 dengan `ok: true` dan `issues: []`. Public acceptance hanya membuktikan health, routing/challenge, allowlist origin, serta navigasi; belum membuktikan proof login wallet.
5. Pastikan PostgreSQL deployment sudah dimigrasi, `DATABASE_URL` aktif pada service yang membuat challenge/sesi, dan issuer serta gate owner dikonfigurasi pada boundary server yang benar. Rahasia tidak boleh memakai prefix `NEXT_PUBLIC_`. Tidak perlu menampilkan nilai env pada layar.
6. Baca `npm run contract:smoke`: catat contract ID, gate, epoch, dan root aktif. **Root saat audit sudah nonzero.** Root itu harus sama dengan tree durable yang menyimpan credential. Bila tree lama tidak tersedia, owner boleh merotasi ke epoch baru dengan root kosong hanya setelah menerima bahwa credential lama akan tidak berlaku. Jangan mengganti root di epoch yang sama demi membuat database kosong terlihat cocok.
7. Siapkan browser profile bersih untuk holder serta browser/profile operator terpisah. Buka DevTools → Network → Preserve log di kedua host. Matikan perekaman ekstensi yang menampilkan seed atau detail Freighter. Siapkan tempat menyimpan hanya data yang sudah disensor.

## 3. Skrip presentasi normal, langkah demi langkah

| Langkah dan layar | Aksi yang dilakukan | Hasil wajib dan bukti |
| --- | --- | --- |
| Landing `https://veilpass.dev` | Jelaskan bahwa issuer melihat alamat saat enrollment, sedangkan host tidak menerima alamat saat login. Buka FAQ, privacy model, dan threat model dari footer. | Semua link membuka halaman docs yang ada. Jelaskan bahwa host verifier **menerima proof dan public inputs** sebagai data sensitif sementara, walau hasil suksesnya minim. VeilPass tidak menyembunyikan IP, fingerprint, atau timing. |
| Dashboard `https://login.veilpass.dev/dashboard` | Tunjukkan contract ID, `premium-holder`, epoch, root, dan status Testnet. Cocokkan dengan `contract:smoke`. | Nilai dashboard sama dengan chain read. Simpan screenshot yang tidak memuat secret. |
| Enrollment `/dashboard/enroll` | Baca disclosure, centang, klik **Connect Freighter and enroll**. Setujui akses public address bila diminta; setujui pesan enrollment satu kali di Freighter. Jangan pindah account di tengah proses. | Progress berakhir **Credential stored**. Pesan yang ditandatangani off-chain, bukan transfer aset. Catat transaction hash update-root dari log operator/chain explorer serta root baru; jangan rekam address, signature, credential secret, atau proof. Jika root publish gagal, jangan lanjut ke login. |
| App A `https://app-a.veilpass.dev` | Klik **Login with VeilPass**. Popup login origin terbuka; biarkan tab enrollment/profile yang sama menyimpan credential. Tunggu proof lokal dan verifikasi server. | Host menampilkan **Host session verified**, `ok: true`, `eligible: true`, `privateAppId`, `gateId`, `epoch`, `origin`, `expiresAt`. `GET /api/session` pada App A menjadi `authenticated: true`; cookie `vp_session` punya `HttpOnly`, `Secure`, `SameSite=Lax`. Catat ID sebagai `A1`, tanpa menyalin proof. |
| App A ulang | Klik login lagi sebelum credential/epoch berubah. Ini harus memakai challenge baru. | Catat `A2`; `A2 = A1`. Challenge lama tidak dipakai. |
| App B `https://app-b.veilpass.dev` | Pada profile holder yang sama, klik login. | Catat `B1`; `B1 ≠ A1`, `origin` adalah App B. App B mendapat cookie sesi sendiri pada origin B. |
| Privasi host | Di Network App A/B, periksa request `/api/challenges`, `/api/verify`, `/api/session` dan respons sukses. | Alamat Stellar `G...` pengguna tidak muncul dalam request/response host. **Jangan** menyimpulkan proof itu anonim: `/api/verify` memang membawa proof, commitment, nullifier, dan revocation hash. Redaksi nilai ini sebelum HAR/screenshot dibagikan. Enrollment issuer dapat melihat address; pisahkan capture enrollment dari capture host. |

Jika popup ditutup, Freighter salah network, account tidak eligible, root berbeda, atau health HTTP 503, tampilkan kode error dan hentikan klaim acceptance. Ulangi dari challenge baru setelah penyebab diperbaiki.

Jika popup menampilkan **Available in IndexedDB** tetapi witness credential tidak ditemukan pada tree aktif, pilih **Re-enroll this browser** yang muncul setelah kegagalan witness. Selesaikan enrollment dengan account Freighter yang dimaksud, lalu mulai login baru dari tombol App A/B. Jika yang muncul adalah kegagalan layanan 503, periksa contract ID, root on-chain, serta tree PostgreSQL terlebih dahulu; mengulang enrollment tidak memperbaiki konfigurasi layanan yang salah.

## 4. Kasus penolakan nyata

Jalankan hanya dengan account/credential demo. DevTools perlu melihat body `/api/verify` untuk pengujian replay/expiry; body itu sensitif. Jangan tempelkan ke chat, issue, repo, atau video mentah. Hapus salinan lokal setelah pengujian, lalu simpan hanya kode hasil dan request ID yang disensor.

1. **Replay.** Pada login App A yang sukses, gunakan DevTools Network → request `POST /api/verify` → **Replay XHR** atau **Copy as fetch** dan jalankan sekali lagi pada origin App A yang sama. Hasil wajib `ok: false`, `error: CHALLENGE_SPENT`; tidak ada sesi baru. Jangan memakai tombol replay pada `/demo` sebagai bukti ini.
2. **Expiry.** Dapatkan proof dan request baru pada App A, tahan pengiriman awal `/api/verify` (misalnya melalui request interception pada test harness/operator browser), lalu kirim body tersebut setelah `proofExpiresAt` dalam public inputs. Hasil wajib `CREDENTIAL_EXPIRED`. Bila challenge lima menit berlalu lebih dulu, `CHALLENGE_EXPIRED` juga adalah penolakan yang benar; catat mana yang terjadi. Sekadar menunggu setelah login sukses lalu me-replay body lama menguji replay/expiry sesuai urutan pemeriksaan, sehingga jangan klaim telah mengisolasi expiry tanpa mencatat waktu request.
3. **Revocation.** Ambil hanya nilai `revocationHash` credential demo dari public inputs request verifikasi yang aman pada operator, atau dari catatan credential operator; jangan tampilkan di video mentah. Gate owner membuka `/dashboard` → **Revoke**, memastikan gate ID dan epoch aktif, mengisi nilai hex 32 byte, lalu memilih **Revoke credential with Freighter** dan menyetujui transaksi Testnet. Catat transaction hash dan konfirmasi `is_revoked=true` dari chain. Challenge baru dan login baru pada App A/B harus mengembalikan `CREDENTIAL_REVOKED`; sesi cookie yang sudah terbit bisa tetap hidup sampai expiry dan **bukan** bukti bahwa revocation gagal. Untuk uji login, gunakan fresh attempt, bukan refresh halaman yang masih punya sesi.
4. **Origin dan gate salah.** Jalankan `npm run production:acceptance` untuk bukti challenge kedua origin berbeda dan origin asing HTTP 403. Dalam login nyata, `origin` pada hasil harus sama dengan host yang membuka popup. Kesalahan gate/origin harus mengembalikan kode aman tanpa stack, secret, atau wallet address.

Setelah revocation, credential itu tidak boleh dipakai untuk demo login sukses lagi. Untuk latihan ulang, gunakan account demo baru atau rencanakan rotasi epoch dan enrollment baru dengan owner. Jangan mencoba menghapus revocation secara diam-diam.

## 5. Bukti yang diserahkan

Simpan pada `frontend/docs/evidence/` dengan nama tanggal dan tanpa rahasia:

- video 3–5 menit: disclosure → gate → enrollment approval → App A dua kali → App B sekali → replay → revocation → batas privasi;
- link transaksi update-root serta revoke, contract ID dan epoch yang cocok;
- screenshot tiga hasil login yang memperlihatkan `A1 = A2` dan `A1 ≠ B1`;
- redacted HAR atau tabel request/response **host** yang menunjukkan tidak ada wallet address; redaksi proof, signature, commitment, nullifier, revocation hash, cookie, challenge, authorization, IP, dan identifier personal;
- hasil expiry dengan waktu pembuatan/kedaluwarsa serta kode error, dan hasil `GET /api/session` tanpa cookie;
- keluaran test lokal dan commit/deployment/package version yang tepat.

Lakukan review file hasil redaksi sebelum commit atau berbagi. Jangan masukkan seed phrase, owner/issuer secret, `DATABASE_URL`, raw proof, atau cookie ke artefak publik.

## 6. Checklist integrasi untuk developer lain

1. Baca `/docs/quickstart`, `/docs/client`, `/docs/server`, `/docs/api`, `/docs/privacy`, dan `/docs/threat-model`. `@veilpass/sdk` membuka popup, tetapi host **harus** menyediakan `POST /api/challenges` dan `POST /api/verify` miliknya. Endpoint hanya contoh implementasi di repository ini; nama route bisa disesuaikan bila SDK kelak menyediakan konfigurasi path.
2. Tentukan satu HTTPS host origin yang tepat, satu login origin, gate ID, dan Testnet contract. Allowlist exact origin pada server; jangan menerima origin dari body/request header tanpa memeriksa konfigurasi deployment.
3. Pakai penyimpanan durable dengan konsumsi atomik challenge dan nullifier; gunakan verifier UltraHonk dengan verification key yang dipin serta policy/root/epoch/revocation dari contract. Setelah `verifyVeilPassProof` sukses, buat sesi server dengan cookie `HttpOnly`, `Secure`, `SameSite=Lax`, expiry yang dibatasi proof. Jangan jadikan nilai dari browser saja sebagai otorisasi.
4. Host jangan log request `/api/verify` atau menyimpan proof/public inputs. Simpan hanya private app ID yang scoped pada origin/epoch sesuai kebutuhan account lokal. Siapkan account migration jika epoch atau credential berubah.
5. Jalankan `npm run pack:check` untuk memverifikasi artefak paket dan jalankan acceptance di **origin milik integrator sendiri**. Versi paket yang diterbitkan di npm harus diperiksa terhadap commit/deployment yang dipakai; perubahan source lokal belum menjadi versi publik. Dalam versi saat ini, paket server menyediakan primitive dan host masih harus memasok adapter database, policy chain, dan verifier produksi.
6. Pertahankan pernyataan cakupan: ini MVP Stellar Testnet, bukan mainnet/security audit atau solusi anonimitas jaringan. Gerbang rilis untuk developer eksternal adalah bukti acceptance live di atas, audit keamanan yang sesuai risiko, package version baru yang benar-benar terbit, dan contoh integrasi mandiri yang dijalankan terhadap deployment yang sama.

## 7. Lembar hasil acceptance yang diisi saat demo

| Pemeriksaan | Nilai/tautan yang boleh dipublikasikan | Status |
| --- | --- | --- |
| Commit dan deployment yang sama | Source sudah di-merge ke `master` (CI quality dan browser hijau); docs live HTTP 200. Deployment ID terbaru yang melayani commit 3edf897 belum dicatat. | Sebagian |
| Versi npm SDK/shared/server yang sesuai | Registry menampilkan `0.2.0`; protected tag `v0.2.1` gagal di langkah OIDC authorization saat publish pertama, `@veilpass/shared` | Belum lengkap; butuh npm owner authorization |
| Health, env validation, migrasi, root/tree cocok | Production health 200; witness refresh dan `/api/verify` memakai root/credential Production dengan sukses; dashboard menampilkan gate owner | Lulus |
| Update-root transaction |  | Belum dicatat |
| App A `A1 = A2`, App B `B1 ≠ A1` | Sudah diuji di Chrome: App A sukses 2/2 dengan ID stabil dan App B 1/1 dengan ID berbeda; nilai mentah tidak dicatat | Lulus |
| Host HAR tanpa wallet address, dengan data proof tersensor |  | Belum dicatat |
| Replay `CHALLENGE_SPENT` |  | Belum dicatat |
| Expiry `CREDENTIAL_EXPIRED` atau `CHALLENGE_EXPIRED` |  | Belum dicatat |
| Revoke transaction + login baru `CREDENTIAL_REVOKED` |  | Belum dicatat |
| Video dan laporan test/coverage lengkap | 279/279 Vitest; 87 file; 106 executable TypeScript/TSX/MJS menerima statement coverage; full inventory 77.16% statements, 75.14% branches, 79.10% functions, 79.51% lines; video belum direkam | Sebagian |

**Aturan keputusan:** seluruh baris harus memiliki bukti nyata sebelum demo disebut selesai atau siap dipakai developer eksternal. Bila satu baris kosong, statusnya tetap belum terverifikasi, sekalipun unit test hijau.
