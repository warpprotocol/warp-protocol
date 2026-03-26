import pino from "pino";
import type { ClassificationResult, AgentClass } from "@warp-protocol/classifier";
import { FEATURE_NAMES } from "@warp-protocol/classifier";
import type { AgentSignal } from "@warp-protocol/scanner";
import {
  Verdict,
  type VerdictResult,
  type VerdictReason,
  type VerdictThresholds,
  type VerdictEngineConfig,
  type VerdictChangeCallback,
} from "./types";

const logger = pino({ name: "warp-verdict-engine" });

const DEFAULT_THRESHOLDS: VerdictThresholds = {
  minConfidence: 0.65,
  minTransactions: 5,
  minSignals: 10,
  autonomousThreshold: 0.75,
  humanThreshold: 0.70,
  verdictTtlSeconds: 300,
};

/**
 * Default feature weights for verdict reasoning. Higher weights indicate
 * features that contribute more strongly to the final verdict explanation.
 */
const DEFAULT_FEATURE_WEIGHTS: Record<string, number> = {
  timing_interval_cv: 2.5,
  timing_periodicity_score: 2.8,
  timing_night_ratio: 1.2,
  freq_tx_per_hour_1h: 1.8,
  freq_active_hours_count: 1.5,
  prog_unique_programs_invoked: 1.3,
  prog_dominant_program_ratio: 2.0,
  prog_known_dex_ratio: 1.6,
  ix_mean_instruction_count: 1.4,
  ix_data_entropy_mean: 1.1,
  graph_unique_counterparties: 1.7,
  graph_repeat_counterparty_ratio: 2.2,
  graph_clustering_coefficient: 1.9,
  err_error_rate: 1.5,
  err_retry_pattern_score: 2.3,
};

/**
 * VerdictEngine combines classification results with signal data
 * to produce a final verdict for an agent address. It applies
 * confidence thresholds, generates human-readable reasons, and
 * manages verdict caching and change notifications.
 */
export class VerdictEngine {
  private readonly config: VerdictEngineConfig;
  private readonly verdictCache: Map<string, VerdictResult> = new Map();
  private readonly changeCallbacks: VerdictChangeCallback[] = [];

  constructor(config: Partial<VerdictEngineConfig> = {}) {
    this.config = {
      thresholds: config.thresholds ?? DEFAULT_THRESHOLDS,
      featureWeights: config.featureWeights ?? DEFAULT_FEATURE_WEIGHTS,
      enableReasonGeneration: config.enableReasonGeneration ?? true,
    };
  }

  /**
   * Compute a verdict for the given address based on classification
   * results and raw signal data.
   */
  computeVerdict(
    address: string,
    classification: ClassificationResult | null,
    signals: AgentSignal[],
    transactionCount: number
  ): VerdictResult {
    const startTime = performance.now();

    // Check minimum data requirements
    if (
      transactionCount < this.config.thresholds.minTransactions ||
      signals.length < this.config.thresholds.minSignals
    ) {
      logger.info(
        { address, transactionCount, signalCount: signals.length },
        "Insufficient data for verdict"
      );

      return this.buildResult(
        address,
        Verdict.INSUFFICIENT_DATA,
        0,
        null,
        signals.length,
        transactionCount,
        [
          {
            code: "INSUFFICIENT_DATA",
            description:
              `Need at least ${this.config.thresholds.minTransactions} transactions ` +
              `and ${this.config.thresholds.minSignals} signals. ` +
              `Got ${transactionCount} transactions and ${signals.length} signals.`,
            weight: 1.0,
            featureContribution: 0,
          },
        ]
      );
    }

    if (!classification) {
      return this.buildResult(
        address,
        Verdict.INSUFFICIENT_DATA,
        0,
        null,
        signals.length,
        transactionCount,
        [
          {
            code: "NO_CLASSIFICATION",
            description: "Classification model did not produce a result.",
            weight: 1.0,
            featureContribution: 0,
          },
        ]
      );
    }

    const verdict = this.resolveVerdict(classification);
    const reasons = this.config.enableReasonGeneration
      ? this.generateReasons(classification, verdict)
      : [];

    const result = this.buildResult(
      address,
      verdict,
      classification.confidence,
      classification,
      signals.length,
      transactionCount,
      reasons
    );

    // Check for verdict changes and notify listeners
    const cached = this.verdictCache.get(address);
    if (cached && cached.verdict !== result.verdict) {
      for (const cb of this.changeCallbacks) {
        cb(address, cached.verdict, result.verdict);
      }
    }

    this.verdictCache.set(address, result);

    const elapsed = performance.now() - startTime;
    logger.info(
      {
        address,
        verdict: result.verdict,
        confidence: result.confidence.toFixed(4),
        elapsedMs: elapsed.toFixed(2),
      },
      "Verdict computed"
    );

    return result;
  }

  /**
   * Resolve the final verdict from classification probabilities
   * and configured thresholds.
   */
  private resolveVerdict(classification: ClassificationResult): Verdict {
    const { probabilities, confidence } = classification;
    const thresholds = this.config.thresholds;

    if (confidence < thresholds.minConfidence) {
      // When confidence is too low, default to HYBRID as the
      // middle-ground classification
      return Verdict.HYBRID;
    }

    if (
      probabilities.AUTONOMOUS > thresholds.autonomousThreshold &&
      probabilities.AUTONOMOUS > probabilities.HUMAN &&
      probabilities.AUTONOMOUS > probabilities.HYBRID
    ) {
      return Verdict.AUTONOMOUS;
    }

    if (
      probabilities.HUMAN > thresholds.humanThreshold &&
      probabilities.HUMAN > probabilities.AUTONOMOUS &&
      probabilities.HUMAN > probabilities.HYBRID
    ) {
      return Verdict.HUMAN;
    }

    return Verdict.HYBRID;
  }

  /**
   * Generate human-readable reasons for the verdict based on
   * the most influential features in the classification.
   */
  private generateReasons(
    classification: ClassificationResult,
    verdict: Verdict
  ): VerdictReason[] {
    const reasons: VerdictReason[] = [];
    const featureValues = classification.featureVector.values;
    const featureNames = classification.featureVector.featureNames;

    // Compute weighted feature contributions
    const contributions: Array<{
      name: string;
      value: number;
      weight: number;
      contribution: number;
    }> = [];

    for (let i = 0; i < featureNames.length; i++) {
      const name = featureNames[i];
      const weight = this.config.featureWeights[name] || 1.0;
      const value = featureValues[i];
      const contribution = Math.abs(value) * weight;
      contributions.push({ name, value, weight, contribution });
    }

    // Sort by contribution and take top 5
    contributions.sort((a, b) => b.contribution - a.contribution);
    const topFeatures = contributions.slice(0, 5);

    for (const feat of topFeatures) {
      reasons.push({
        code: feat.name.toUpperCase(),
        description: this.describeFeature(feat.name, feat.value, verdict),
        weight: feat.weight,
        featureContribution: feat.contribution,
      });
    }

    return reasons;
  }

  /**
   * Produce a natural language description of a feature's contribution.
   */
  private describeFeature(
    name: string,
    value: number,
    verdict: Verdict
  ): string {
    const descriptions: Record<string, (v: number) => string> = {
      timing_interval_cv: (v) =>
        v < 0.3
          ? "Transaction intervals are highly regular, suggesting automated execution."
          : "Transaction intervals show natural variation.",
      timing_periodicity_score: (v) =>
        v > 0.7
          ? "Strong periodic pattern detected in transaction timing."
          : "No strong periodicity in transaction timing.",
      graph_repeat_counterparty_ratio: (v) =>
        v > 0.6
          ? "Frequently interacts with the same set of addresses."
          : "Diverse set of counterparty addresses.",
      err_retry_pattern_score: (v) =>
        v > 0.5
          ? "Shows systematic retry behavior after failed transactions."
          : "No significant retry patterns observed.",
      prog_dominant_program_ratio: (v) =>
        v > 0.8
          ? "Almost exclusively uses a single program, typical of specialized bots."
          : "Interacts with multiple programs.",
      freq_tx_per_hour_1h: (v) =>
        v > 20
          ? "Very high transaction frequency in the last hour."
          : `Moderate transaction frequency: ${v.toFixed(1)} per hour.`,
    };

    const descFn = descriptions[name];
    if (descFn) return descFn(value);

    return `Feature ${name} = ${value.toFixed(4)} contributed to ${verdict} verdict.`;
  }

  /**
   * Register a callback for verdict change notifications.
   */
  onVerdictChange(callback: VerdictChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Get a cached verdict for an address, if available and not expired.
   */
  getCachedVerdict(address: string): VerdictResult | null {
    const cached = this.verdictCache.get(address);
    if (!cached) return null;

    const ageSeconds = (Date.now() - cached.timestamp) / 1000;
    if (ageSeconds > cached.ttlSeconds) {
      this.verdictCache.delete(address);
      return null;
    }

    return cached;
  }

  /**
   * Clear all cached verdicts.
   */
  clearCache(): void {
    this.verdictCache.clear();
  }

  get cacheSize(): number {
    return this.verdictCache.size;
  }

  private buildResult(
    address: string,
    verdict: Verdict,
    confidence: number,
    classification: ClassificationResult | null,
    signalCount: number,
    transactionCount: number,
    reasons: VerdictReason[]
  ): VerdictResult {
    return {
      address,
      verdict,
      confidence,
      classification,
      signalCount,
      transactionCount,
      reasons,
      timestamp: Date.now(),
      ttlSeconds: this.config.thresholds.verdictTtlSeconds,
    };
  }
}
