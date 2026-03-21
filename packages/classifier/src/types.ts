/**
 * Types for the Warp Protocol classifier package.
 */

export type AgentClass = "AUTONOMOUS" | "HYBRID" | "HUMAN";

/**
 * A 47-dimensional feature vector extracted from agent behavior signals.
 * Each element corresponds to a named feature in the FEATURE_NAMES array.
 */
export interface FeatureVector {
  values: Float32Array;
  featureNames: string[];
  address: string;
  extractedAt: number;
}

export interface ClassificationResult {
  address: string;
  label: AgentClass;
  confidence: number;
  probabilities: {
    AUTONOMOUS: number;
    HYBRID: number;
    HUMAN: number;
  };
  featureVector: FeatureVector;
  modelVersion: string;
  latencyMs: number;
}

export interface ModelConfig {
  modelPath: string;
  version: string;
  inputName: string;
  outputName: string;
  featureDim: number;
  batchSize: number;
}

export interface CalibrationParams {
  /** Platt scaling parameters per class. */
  autonomous: { a: number; b: number };
  hybrid: { a: number; b: number };
  human: { a: number; b: number };
}
