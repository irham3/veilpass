export type NormalizedOrigin = `${"http" | "https"}://${string}`;

function isLoopback(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function normalizeOrigin(input: string): NormalizedOrigin {
  let parsed: URL;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Origin must be an absolute HTTP or HTTPS origin");
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const hasExtraParts =
    (parsed.pathname !== "" && parsed.pathname !== "/") ||
    parsed.search !== "" ||
    parsed.hash !== "";

  if (protocol !== "https:" && protocol !== "http:") {
    throw new Error("Origin must use HTTP or HTTPS");
  }
  if (protocol === "http:" && !isLoopback(hostname)) {
    throw new Error("Origin must use HTTPS outside local development");
  }
  if (
    !hostname ||
    hostname.includes("*") ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    hasExtraParts
  ) {
    throw new Error("Origin must not include credentials, wildcards, or URL parts");
  }

  return `${protocol}//${parsed.host.toLowerCase()}` as NormalizedOrigin;
}
