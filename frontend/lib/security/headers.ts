export function createContentSecurityPolicy(
  nonce: string,
  isDevelopment: boolean,
) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Barretenberg loads its bundled WASM through fetch(data:application/gzip).
    "connect-src 'self' data: https://soroban-testnet.stellar.org https://horizon-testnet.stellar.org",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const securityHeaders: Array<{ key: string; value: string }> = [
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

// The hosted login intentionally communicates with an exact, cross-origin
// opener. Its postMessage channel additionally binds origin, Window source,
// request state, challenge origin, and gate ID. A stricter COOP value on both
// origins would sever window.opener before that application-level binding can
// run.
export const popupOpenerHeaders: Array<{ key: string; value: string }> = [
  { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
];
