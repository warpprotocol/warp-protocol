/**
 * Backfill historical agent deployments from a slot range.
 *
 * Usage:
 *   npx tsx scripts/backfill.ts --from-slot 280000000 --to-slot 290000000
 */

import { Connection } from "@solana/web3.js";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

async function main() {
  const args = process.argv.slice(2);
  const fromSlot = parseInt(args[args.indexOf("--from-slot") + 1] || "0", 10);
  const toSlot = parseInt(args[args.indexOf("--to-slot") + 1] || "0", 10);

  if (!fromSlot || !toSlot) {
    console.error("usage: npx tsx scripts/backfill.ts --from-slot N --to-slot M");
    process.exit(1);
  }

  console.log(`backfilling slots ${fromSlot} to ${toSlot}`);
  const connection = new Connection(RPC_URL);

  let slot = fromSlot;
  let scanned = 0;

  while (slot <= toSlot) {
    try {
      const block = await connection.getBlock(slot, {
        maxSupportedTransactionVersion: 0,
        transactionDetails: "full",
      });
      if (block) {
        scanned += block.transactions.length;
      }
    } catch {
      // skip empty slots
    }
    slot += 1;
    if (slot % 1000 === 0) {
      console.log(`slot ${slot} / ${toSlot} (${scanned} txs scanned)`);
    }
  }

  console.log(`done. scanned ${scanned} transactions.`);
}

main().catch(console.error);
