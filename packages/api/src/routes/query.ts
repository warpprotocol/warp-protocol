import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { SolanaListener, extractTimingSignals, extractFrequencySignals, extractErrorPatternSignals, extractBalanceSignals } from "@warp-protocol/scanner";
import { OnnxClassifier, extractFeatures } from "@warp-protocol/classifier";
import { VerdictEngine } from "@warp-protocol/verdict-engine";

const batchQuerySchema = z.object({
  addresses: z
    .array(z.string().min(32).max(44))
    .min(1, "At least one address is required")
    .max(100, "Maximum 100 addresses per batch request"),
  options: z
    .object({
      skipCache: z.boolean().optional().default(false),
      includeReasons: z.boolean().optional().default(true),
    })
    .optional()
    .default({}),
});

type BatchQueryBody = z.infer<typeof batchQuerySchema>;

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
 * POST /v1/query
 *
 * Batch query endpoint for classifying multiple agent addresses in one
 * request. Supports up to 100 addresses per call. Returns an array of
 * verdicts with optional reason generation.
 */
export async function queryRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/query",
    async (
      request: FastifyRequest<{ Body: BatchQueryBody }>,
      reply: FastifyReply
    ) => {
      const parsed = batchQuerySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "INVALID_REQUEST",
          message: parsed.error.issues.map((i) => i.message).join("; "),
        });
      }

      const { addresses, options } = parsed.data;
      const startTime = performance.now();

      try {
        await ensureModelLoaded();

        const results = await Promise.allSettled(
          addresses.map(async (address) => {
            // Check cache unless explicitly skipped
            if (!options.skipCache) {
              const cached = verdictEngine.getCachedVerdict(address);
              if (cached) {
                return {
                  address: cached.address,
                  verdict: cached.verdict,
                  confidence: cached.confidence,
                  reasons: options.includeReasons ? cached.reasons : [],
                  signalCount: cached.signalCount,
                  transactionCount: cached.transactionCount,
                  cached: true,
                };
              }
            }

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

            return {
              address: verdict.address,
              verdict: verdict.verdict,
              confidence: verdict.confidence,
              reasons: options.includeReasons ? verdict.reasons : [],
              signalCount: verdict.signalCount,
              transactionCount: verdict.transactionCount,
              cached: false,
            };
          })
        );

        const successes = results
          .filter(
            (r): r is PromiseFulfilledResult<(typeof results)[0] extends PromiseSettledResult<infer T> ? T : never> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value);

        const failures = results
          .map((r, i) => ({ result: r, address: addresses[i] }))
          .filter((r) => r.result.status === "rejected")
          .map((r) => ({
            address: r.address,
            error: "VERDICT_FAILED",
          }));

        const elapsed = performance.now() - startTime;

        return reply.send({
          data: {
            results: successes,
            errors: failures,
            meta: {
              total: addresses.length,
              succeeded: successes.length,
              failed: failures.length,
              latencyMs: Math.round(elapsed),
            },
          },
        });
      } catch (err) {
        request.log.error(err, "Batch query failed");
        return reply.status(500).send({
          error: "BATCH_QUERY_FAILED",
          message: "An internal error occurred during batch processing.",
        });
      }
    }
  );
}
