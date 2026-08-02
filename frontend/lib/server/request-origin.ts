import "server-only";

import { normalizeOrigin } from "@/packages/shared/src/origin";

export function resolveTrustedOrigin({ configuredOrigin, requestUrl, originHeader }: { configuredOrigin?: string; requestUrl: string; originHeader: string | null }): string {
  let trusted: string;
  if (configuredOrigin) {
    trusted = normalizeOrigin(configuredOrigin);
  } else {
    const requestOrigin = new URL(requestUrl).origin;
    const hostname = new URL(requestOrigin).hostname.replace(/^\[|\]$/g, "");
    if (!new Set(["localhost", "127.0.0.1", "::1"]).has(hostname)) throw new Error("A configured host origin is required outside loopback development");
    trusted = normalizeOrigin(requestOrigin);
  }
  if (!originHeader || normalizeOrigin(originHeader) !== trusted) throw new Error("Request origin mismatch");
  return trusted;
}
