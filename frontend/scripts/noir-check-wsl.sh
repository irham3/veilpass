#!/usr/bin/env bash
set -euo pipefail

readonly NARGO_VERSION="1.0.0-beta.22"
readonly BB_VERSION="5.0.0-nightly.20260522"
export PATH="$HOME/.nargo/bin:$HOME/.bb:$PATH"

if [[ "$(nargo --version | sed -n 's/nargo version = //p' | head -n1)" != "$NARGO_VERSION" ]]; then
  echo "Expected Nargo $NARGO_VERSION" >&2
  exit 1
fi

cd "$(dirname "$0")/../packages/proof/circuits/membership"
if [[ "$(bb --version)" != "$BB_VERSION" ]]; then
  echo "Expected Barretenberg $BB_VERSION" >&2
  exit 1
fi

nargo test
nargo execute
mkdir -p target/fixture
bb prove -b ./target/veilpass_membership.json -w ./target/veilpass_membership.gz --write_vk -o ./target/fixture
bb verify -p ./target/fixture/proof -k ./target/fixture/vk
