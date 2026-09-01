#!/usr/bin/env bash
set -euo pipefail

# Run this inside WSL/Linux. It pins Nargo for deterministic circuit builds.
readonly NARGO_VERSION="1.0.0-beta.22"
readonly BB_VERSION="5.0.0-nightly.20260522"

if ! command -v noirup >/dev/null 2>&1; then
  curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
fi

export PATH="$HOME/.nargo/bin:$HOME/.bb:$PATH"
noirup --version "$NARGO_VERSION"

if ! command -v bbup >/dev/null 2>&1; then
  curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/next/barretenberg/bbup/install | bash
fi

bbup --version "$BB_VERSION" --no-modify-path
echo "Nargo installed: $(nargo --version | head -n1)"
echo "Barretenberg installed: $(bb --version)"
