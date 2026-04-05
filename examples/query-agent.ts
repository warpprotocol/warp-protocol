/**
 * Example: query a single agent's verdict via the Warp Protocol SDK.
 *
 * Usage:
 *   npx tsx examples/query-agent.ts <agent-address>
 */

import { WarpClient } from "@warp-protocol/sdk";

async function main() {
  const address = process.argv[2];
  if (!address) {
    console.error("usage: npx tsx examples/query-agent.ts <agent-address>");
    process.exit(1);
  }

  const client = new WarpClient({ baseUrl: "https://api.warpprotocol.xyz" });
  const verdict = await client.query(address);

  console.log(`agent:          ${verdict.address}`);
  console.log(`classification: ${verdict.classification}`);
  console.log(`confidence:     ${(verdict.confidence * 100).toFixed(1)}%`);
  console.log(`attestation:    ${verdict.attestation?.account ?? "none"}`);
}

main().catch(console.error);
