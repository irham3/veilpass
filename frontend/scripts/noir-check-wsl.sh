#!/usr/bin/env bash
set -euo pipefail

readonly NARGO_VERSION="1.0.0-beta.26"
export PATH="$HOME/.nargo/bin:$PATH"

if [[ "$(nargo --version | sed -n 's/nargo version = //p' | head -n1)" != "$NARGO_VERSION" ]]; then
  echo "Expected Nargo $NARGO_VERSION" >&2
  exit 1
fi

cd "$(dirname "$0")/../packages/proof/circuits/membership"
nargo compile
