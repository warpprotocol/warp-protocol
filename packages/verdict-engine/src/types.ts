import type { AgentClass, ClassificationResult } from "@warp-protocol/classifier";

export enum Verdict {
  AUTONOMOUS = "AUTONOMOUS",
  HYBRID = "HYBRID",
  HUMAN = "HUMAN",
  INSUFFICIENT_DATA = "INSUFFICIENT_DATA",
}

export interface VerdictResult {
  address: string;
  verdict: Verdict;
  confidence: number;
  classification: ClassificationResult | null;
  signalCount: number;
  transactionCount: number;
  reasons: VerdictReason[];
  timestamp: number;
  ttlSeconds: number;
}

export interface VerdictReason {
  code: string;
  description: string;
  weight: number;
  featureContribution: number;
}

export interface VerdictThresholds {
  /** Minimum confidence to issue a definitive verdict. */
  minConfidence: number;
  /** Minimum number of transactions required for classification. */
  minTransactions: number;
  /** Minimum number of signals required for classification. */
  minSignals: number;
  /** Confidence threshold above which AUTONOMOUS is assigned. */
  autonomousThreshold: number;
  /** Confidence threshold above which HUMAN is assigned. */
  humanThreshold: number;
  /** TTL in seconds for cached verdicts. */
  verdictTtlSeconds: number;
}

export interface VerdictEngineConfig {
  thresholds: VerdictThresholds;
  featureWeights: Record<string, number>;
  enableReasonGeneration: boolean;
}

export type VerdictChangeCallback = (
  address: string,
  oldVerdict: Verdict | null,
  newVerdict: Verdict
) => void;
