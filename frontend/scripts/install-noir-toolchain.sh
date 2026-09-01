#!/usr/bin/env bash
set -euo pipefail

# Run this inside WSL/Linux. It pins Nargo for deterministic circuit builds.
readonly NARGO_VERSION="1.0.0-beta.26"

if ! command -v noirup >/dev/null 2>&1; then
  curl -L https://raw.githubusercontent.com/noir-lang/noirup/refs/heads/main/install | bash
fi

export PATH="$HOME/.nargo/bin:$HOME/.bb:$PATH"
noirup --version "$NARGO_VERSION"

if ! command -v bbup >/dev/null 2>&1; then
  curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/refs/heads/next/barretenberg/bbup/install | bash
fi

echo "Nargo installed: $(nargo --version | head -n1)"
echo "Install the Barretenberg version compatible with this Nargo release using bbup, then record bb --version in release evidence."
