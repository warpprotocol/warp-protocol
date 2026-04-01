import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { SolanaListener, extractTimingSignals, extractFrequencySignals, extractErrorPatternSignals, extractBalanceSignals } from "@warp-protocol/scanner";
import { OnnxClassifier, extractFeatures } from "@warp-protocol/classifier";
import { VerdictEngine } from "@warp-protocol/verdict-engine";

const addressParamSchema = z.object({
  address: z
    .string()
    .min(32, "Solana address must be at least 32 characters")
    .max(44, "Solana address must be at most 44 characters"),
});

const classifier = new OnnxClassifier();
const verdictEngine = new VerdictEngine();
const listener = new SolanaListener({
  rpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  wsUrl: process.env.SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com",
});

let modelLoaded = false;

async function ensureModelLoaded(): Promise<void> {
  if (!modelLoaded) {
    await classifier.load();
    modelLoaded = true;
  }
}

/**
 * GET /v1/verdict/:address
 *
 * Returns the current verdict for a Solana address. If a cached verdict
 * exists and has not expired, it is returned immediately. Otherwise,
 * the scanner fetches recent transactions, extracts features, runs
 * inference, and computes a fresh verdict.
 */
export async function verdictRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/verdict/:address",
    async (
      request: FastifyRequest<{ Params: { address: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = addressParamSchema.safeParse(request.params);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "INVALID_ADDRESS",
          message: parsed.error.issues[0].message,
        });
      }

      const { address } = parsed.data;

      // Check cache first
      const cached = verdictEngine.getCachedVerdict(address);
      if (cached) {
        return reply.send({
          data: {
            address: cached.address,
            verdict: cached.verdict,
            confidence: cached.confidence,
            reasons: cached.reasons,
            signalCount: cached.signalCount,
            transactionCount: cached.transactionCount,
            timestamp: cached.timestamp,
            cached: true,
          },
        });
      }

      try {
        await ensureModelLoaded();

        const transactions = await listener.fetchHistoricalTransactions(
          address,
          200
        );

        const signals = [
          ...extractTimingSignals(address, transactions),
          ...extractFrequencySignals(address, transactions),
          ...extractErrorPatternSignals(address, transactions),
          ...extractBalanceSignals(address, transactions),
        ];

        const features = extractFeatures(address, signals);
        const classification = await classifier.classify(features);
        const verdict = verdictEngine.computeVerdict(
          address,
          classification,
          signals,
          transactions.length
        );

        return reply.send({
          data: {
            address: verdict.address,
            verdict: verdict.verdict,
            confidence: verdict.confidence,
            reasons: verdict.reasons,
            signalCount: verdict.signalCount,
            transactionCount: verdict.transactionCount,
            timestamp: verdict.timestamp,
            cached: false,
          },
        });
      } catch (err) {
        request.log.error(err, "Failed to compute verdict");
        return reply.status(500).send({
          error: "VERDICT_COMPUTATION_FAILED",
          message: "An internal error occurred while computing the verdict.",
        });
      }
    }
  );
}
