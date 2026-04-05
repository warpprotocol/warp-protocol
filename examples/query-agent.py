"""Example: query a single agent's verdict via the Warp Protocol REST API."""

import json
import sys
import urllib.request

BASE = "https://api.warpprotocol.xyz/v1"

def main() -> None:
    if len(sys.argv) < 2:
        print("usage: python examples/query-agent.py <agent-address>")
        sys.exit(1)

    address = sys.argv[1]
    url = f"{BASE}/verdict/{address}"

    with urllib.request.urlopen(url) as resp:
        data = json.loads(resp.read())

    print(f"agent:          {data['address']}")
    print(f"classification: {data['classification']}")
    print(f"confidence:     {data['confidence'] * 100:.1f}%")
    print(f"attestation:    {data.get('attestation', {}).get('account', 'none')}")

if __name__ == "__main__":
    main()
