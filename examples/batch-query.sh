#!/usr/bin/env bash
# Example: batch query multiple agents via the REST API.
#
# Usage:
#   bash examples/batch-query.sh

curl -s -X POST https://api.warpprotocol.xyz/v1/query \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      "Agent1111111111111111111111111111111111111",
      "Agent2222222222222222222222222222222222222",
      "Agent3333333333333333333333333333333333333"
    ]
  }' | python3 -m json.tool
