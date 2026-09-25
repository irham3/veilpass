# VeilPass — Demo & Presentation Guide

Panduan lengkap untuk mendemokan VeilPass kepada developer atau investor, mulai dari setup lokal hingga seluruh alur kerja end-to-end.

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Setup Lokal](#2-setup-lokal)
3. [Alur Demo Interaktif (Landing Page)](#3-alur-demo-interaktif-landing-page)
4. [Alur Demo Live (Freighter Wallet)](#4-alur-demo-live-freighter-wallet)
5. [Mendemonstrasikan Skenario Keamanan](#5-mendemonstrasikan-skenario-keamanan)
6. [Mendemonstrasikan SDK Integration](#6-mendemonstrasikan-sdk-integration)
7. [Narasi Teknis untuk Audiens Developer](#7-narasi-teknis-untuk-audiens-developer)
8. [Test & Coverage Evidence](#8-test--coverage-evidence)

---

## 1. Prasyarat

| Komponen | Versi | Catatan |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 9 | `pnpm --version` |
| Freighter Extension | >= 4.x | Chrome/Brave/Firefox |
| Stellar Testnet XLM | >= 1 XLM | Diperlukan untuk enrollment |

**Setup Freighter untuk Testnet:**
1. Install Freighter (https://www.freighter.app/) di browser
2. Buat atau import wallet
3. Buka Settings -> Network -> pilih **TESTNET**
4. Topup XLM via Stellar Friendbot: https://friendbot.stellar.org?addr=YOUR_ADDRESS

---

## 2. Setup Lokal

```bash
# Clone & install
git clone <repo>
cd frontend
pnpm install

# Salin env file
cp .env.example .env.local
```

**Edit `.env.local` minimal untuk demo:**

```env
# Wajib untuk enrollment flow
NEXT_PUBLIC_VEILPASS_ORIGIN=http://localhost:3000

# Opsional - tanpa ini hanya demo interaktif yang berjalan
DATABASE_URL=postgresql://...
VEILPASS_ISSUER_SECRET=S...
VEILPASS_HOST_ORIGIN=http://localhost:3000
```

```bash
# Jalankan dev server
pnpm dev
# -> Buka http://localhost:3000
```

**Verifikasi server berjalan:**
```bash
curl http://localhost:3000/api/health
# -> {"ok":true,"issues":[],"checks":{...}}
```

---

## 3. Alur Demo Interaktif (Landing Page)

> **Cocok untuk:** Investor pitch, conference demo, audiens non-teknis.  
> Tidak memerlukan database atau Freighter wallet.

### Langkah-langkah

**3.1 Buka halaman utama** — `http://localhost:3000`

**3.2 Scroll ke bagian "Interactive Demo"**

Tunjukkan panel dua-panel:
- Kiri: Hasil verifikasi VeilPass (minimized)
- Kanan: Verification log (real-time)

**3.3 Demonstrasikan pemisahan private ID antar app:**

```
Klik tab "App A" -> Klik "Login with VeilPass"
```

Catat `privateAppId` di payload: `vp_appA_72f1`

```
Klik tab "App B" -> Klik "Login with VeilPass"
```

Catat `privateAppId` berbeda: `vp_appB_19c8`

> **Narasi:** "Dua aplikasi berbeda mendapatkan ID yang berbeda meskipun wallet yang sama digunakan. App A tidak pernah tahu user juga login ke App B."

**3.4 Bandingkan dengan Standard Login:**

```
Klik "Standard wallet login"
```

Payload yang muncul mengekspos alamat publik wallet: `GBRPUBLIC7B5E6K2P`. Kontraskan dengan VeilPass yang hanya mengirim `privateAppId`.

**3.5 Demonstrasikan Replay Prevention:**

```
Klik "Login with VeilPass" (pertama kali)
Klik "Replay last challenge"
```

Log menampilkan `CHALLENGE_SPENT` — challenge sudah tidak bisa dipakai ulang.

**3.6 Demonstrasikan Revocation:**

```
Klik "Revoke credential"
Klik "Login with VeilPass"
```

Log menampilkan `CREDENTIAL_REVOKED` — wallet yang sudah di-revoke tidak bisa login.

**3.7 Reset dan ulangi** dengan klik "Reset bench".

---

## 4. Alur Demo Live (Freighter Wallet)

> **Cocok untuk:** Technical review, developer onboarding, deliverable acceptance.  
> Memerlukan database + Freighter extension + Testnet XLM.

### 4.1 Enrollment (Satu Kali per Wallet)

**Tujuan:** Mendaftarkan wallet ke Merkle tree credential.

1. Buka `http://localhost:3000/enroll`
2. Pastikan Freighter terbuka dan terhubung ke **TESTNET**
3. Klik **"Connect Freighter"** — izinkan koneksi
4. Klik **"Enroll"**
5. Freighter meminta signature — klik **"Approve"**
6. Tunggu konfirmasi: `"Credential issued successfully"`

**Apa yang terjadi di background:**
- SDK membuat enrollment challenge via `/api/enrollment/challenge`
- Freighter sign pesan dengan format SEP-53: `VeilPass enrollment\norigin:...\ngate:...\nnonce:...`
- Server verifikasi signature dan menerbitkan leaf di Merkle tree
- Leaf index dan root disimpan di database

### 4.2 Login Flow (Setelah Enrollment)

**Tujuan:** Membuktikan membership tanpa mengekspos wallet address.

1. Buka `http://localhost:3000` (App A)
2. Klik **"Login with VeilPass"** di hero section atau demo panel
3. Popup VeilPass muncul di `http://localhost:3000/login`
4. Freighter meminta signature — klik **"Approve"**
5. Popup tertutup, host menerima:

```json
{
  "ok": true,
  "eligible": true,
  "privateAppId": "vp_appA_xxxx",
  "gateId": "premium-holder",
  "epoch": 20391,
  "origin": "http://localhost:3000",
  "expiresAt": "2026-08-02T09:00:00.000Z"
}
```

**Apa yang terjadi di background:**
- Host SDK (`VeilPass.login()`) open popup dan issue challenge
- Popup sign challenge dengan Freighter (SEP-53)
- Noir circuit generate ZK proof of Merkle membership
- Proof dikirim ke `/api/verify`
- Server verify proof, cek nullifier belum dipakai, buat session cookie

### 4.3 Verifikasi Session

```bash
curl http://localhost:3000/api/session \
  -H "Cookie: vp_session=<token>"
# -> {"authenticated":true,"privateAppId":"vp_appA_xxxx","gateId":"premium-holder"}
```

---

## 5. Mendemonstrasikan Skenario Keamanan

### 5.1 Replay Attack Prevention

```bash
# Capture proof result dari login pertama, lalu kirim ulang
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '<proof_result_json>'
# -> {"ok":false,"error":"CHALLENGE_SPENT","requestId":"..."}
```

### 5.2 Cross-Origin Rejection

```bash
curl -X POST http://localhost:3000/api/challenges \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil.example" \
  -d '{"gateId":"premium-holder"}'
# -> {"ok":false,"error":"ORIGIN_MISMATCH","requestId":"..."}
```

### 5.3 Credential Revocation

1. Di admin panel, revoke credential wallet target
2. Wallet yang sama coba login ulang
3. Server menolak: `CREDENTIAL_REVOKED`

### 5.4 Expired Proof Rejection

Proof memiliki `expiresAt` field. Setelah waktu berlalu:
- Server cek `expiresAt < now()` sebelum menerima proof
- Response: `{"ok":false,"error":"PROOF_EXPIRED"}`

---

## 6. Mendemonstrasikan SDK Integration

Tunjukkan betapa mudahnya integrasi di sisi host developer:

```typescript
import { VeilPass } from "@veilpass/sdk";

// Setup (satu kali)
const veilpass = new VeilPass({ loginOrigin: "https://veilpass.io" });

// Saat user klik tombol login
async function handleLogin() {
  try {
    const result = await veilpass.login({ gateId: "premium-holder" });
    // result.privateAppId  - ID unik per-app, tidak bisa di-cross-reference
    // result.eligible      - true jika wallet memenuhi gate policy
    // result.expiresAt     - kapan session berakhir
    console.log("Logged in:", result.privateAppId);
  } catch (err) {
    // err.code: "POPUP_BLOCKED" | "POPUP_CLOSED" | "TIMEOUT" | "CREDENTIAL_REVOKED" | ...
    console.error(err.code, err.message);
  }
}
```

**Yang host TIDAK perlu lakukan:**
- Menyimpan wallet address
- Mengelola session token ZK
- Verifikasi Noir proof secara manual
- Integrate Stellar SDK langsung

---

## 7. Narasi Teknis untuk Audiens Developer

### Arsitektur dalam 60 detik

```
User Wallet (Freighter)
    | sign(SEP-53 message)
    v
VeilPass Login Popup
    | Noir ZK proof generation (Barretenberg WASM)
    |   -> prove: "I know a leaf in this Merkle tree"
    |   -> without revealing: which leaf (which wallet)
    v
VeilPass Server /api/verify
    | verifyNoirMembershipProof()
    | challengeStore.consume() [atomic, prevents replay]
    | sessionStore.create() [httpOnly cookie]
    v
Host App
    | privateAppId per-app (deterministic, not linkable)
    + eligible: true (gate policy satisfied)
```

### Poin teknis kunci

| Aspek | Implementasi |
|---|---|
| ZK Circuit | Noir (Aztec Labs) — Poseidon hash, Merkle proof |
| Proof System | UltraHonk (Barretenberg) |
| Wallet | Stellar Freighter + SEP-53 message signing |
| Anti-replay | Nullifier hash di-consume secara atomik di DB |
| Origin binding | Challenge terikat ke `origin` saat issue |
| Privacy | `privateAppId = hash(gateId + walletAddress)` — berbeda per app |

---

## 8. Test & Coverage Evidence

### Hasil Coverage (September 2025)

```
All files  | 100% Stmts | 100% Branch | 100% Funcs | 100% Lines
```

**39 test file, 161+ test case mencakup:**

| Area | Test File |
|---|---|
| ZK Verifier | `lib/server/zk-verifier.test.ts` |
| Credential Issuance | `lib/server/credential-issuance.test.ts` |
| SDK Channel | `packages/sdk/src/channel.test.ts` |
| Server Verifier | `packages/server/src/verifier.test.ts` |
| Noir Circuit Contract | `packages/proof/src/noir.test.ts` |
| HTTP Security Boundaries | `tests/security/http-boundaries.test.ts` |
| Route /api/challenges | `tests/integration/challenge-route.test.ts` |
| Route /api/verify | `tests/integration/verify-route.test.ts` |
| Route /api/session | `tests/integration/session-route.test.ts` |
| Route /api/health | `tests/integration/health-route.test.ts` |
| Route /api/enrollment/issue | `tests/integration/enrollment-issue-route.test.ts` |
| Demo State Machine | `lib/demo/machine.test.ts` |
| SEP-53 Signature | `lib/stellar/message-signature.test.ts` |
| Stellar Eligibility | `lib/stellar/eligibility.test.ts` |

### Security Properties Verified

- Cross-origin request rejection (ORIGIN_MISMATCH)
- Replay prevention (CHALLENGE_SPENT)
- Proof expiry enforcement (PROOF_EXPIRED)
- Credential revocation (CREDENTIAL_REVOKED)
- Body size limit enforcement (4 KB max)
- Stack trace tidak bocor ke response publik
- Cache-Control: no-store pada semua endpoint auth

### Menjalankan Test

```bash
pnpm test           # watch mode
pnpm test:run       # single run
pnpm test:coverage  # dengan coverage report HTML
```

---

## Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| Popup diblokir browser | Izinkan popup untuk localhost:3000 di browser settings |
| WASM memory error | Refresh halaman — SharedArrayBuffer butuh COOP/COEP headers |
| Freighter tidak merespons | Pastikan Freighter unlocked dan di network TESTNET |
| SERVICE_UNAVAILABLE dari /api/verify | Cek DATABASE_URL di .env.local |
| Enrollment gagal | Pastikan wallet punya >= 1 XLM di Testnet |
| ORIGIN_MISMATCH | VEILPASS_HOST_ORIGIN di env harus sama persis dengan origin browser |
