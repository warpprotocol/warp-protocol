#!/usr/bin/env bash
# Deploy the warp-attestation program to Solana.
set -euo pipefail

CLUSTER="${1:-devnet}"
echo "deploying warp-attestation to $CLUSTER"

cd programs/warp-attestation
anchor build
anchor deploy --provider.cluster "$CLUSTER"

echo "done. program deployed to $CLUSTER"
