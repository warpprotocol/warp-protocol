import * as ort from "onnxruntime-node";
import pino from "pino";
import type {
  AgentClass,
  ClassificationResult,
  FeatureVector,
  ModelConfig,
} from "./types";
import { calibrateProbabilities, DEFAULT_CALIBRATION } from "./calibration";

const logger = pino({ name: "warp-classifier-model" });

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  modelPath: "./models/training/exports/classifier_v4.onnx",
  version: "v4",
  inputName: "features",
  outputName: "probabilities",
  featureDim: 47,
  batchSize: 32,
};

const CLASS_LABELS: AgentClass[] = ["AUTONOMOUS", "HYBRID", "HUMAN"];

/**
 * OnnxClassifier loads a trained ONNX model and runs inference
 * on feature vectors to classify agents. It supports batched
 * inference and applies Platt scaling for confidence calibration.
 */
export class OnnxClassifier {
  private session: ort.InferenceSession | null = null;
  private readonly config: ModelConfig;
  private isLoaded = false;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_MODEL_CONFIG, ...config };
  }

  /**
   * Load the ONNX model from disk. Must be called before classify().
   */
  async load(): Promise<void> {
    logger.info({ modelPath: this.config.modelPath }, "Loading ONNX model");

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
    };

    this.session = await ort.InferenceSession.create(
      this.config.modelPath,
      sessionOptions
    );

    this.isLoaded = true;
    logger.info(
      { version: this.config.version },
      "ONNX model loaded successfully"
    );
  }

  /**
   * Classify a single agent given its feature vector.
   * Returns the predicted class, confidence, and per-class probabilities.
   */
  async classify(features: FeatureVector): Promise<ClassificationResult> {
    if (!this.isLoaded || !this.session) {
      throw new Error("Model not loaded. Call load() first.");
    }

    if (features.values.length !== this.config.featureDim) {
      throw new Error(
        `Feature dimension mismatch: expected ${this.config.featureDim}, ` +
          `got ${features.values.length}`
      );
    }

    const startTime = performance.now();

    const inputTensor = new ort.Tensor(
      "float32",
      features.values,
      [1, this.config.featureDim]
    );

    const feeds: Record<string, ort.Tensor> = {
      [this.config.inputName]: inputTensor,
    };

    const results = await this.session.run(feeds);
    const outputData = results[this.config.outputName].data as Float32Array;

    const rawProbs = softmax(Array.from(outputData.slice(0, 3)));
    const calibrated = calibrateProbabilities(rawProbs, DEFAULT_CALIBRATION);

    const maxIdx = calibrated.indexOf(Math.max(...calibrated));
    const label = CLASS_LABELS[maxIdx];
    const confidence = calibrated[maxIdx];

    const latencyMs = performance.now() - startTime;

    return {
      address: features.address,
      label,
      confidence,
      probabilities: {
        AUTONOMOUS: calibrated[0],
        HYBRID: calibrated[1],
        HUMAN: calibrated[2],
      },
      featureVector: features,
      modelVersion: this.config.version,
      latencyMs,
    };
  }

  /**
   * Classify a batch of feature vectors. Splits into chunks
   * according to the configured batch size for efficient inference.
   */
  async classifyBatch(
    featureVectors: FeatureVector[]
  ): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];

    for (let i = 0; i < featureVectors.length; i += this.config.batchSize) {
      const chunk = featureVectors.slice(i, i + this.config.batchSize);
      const chunkResults = await Promise.all(
        chunk.map((fv) => this.classify(fv))
      );
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Release the ONNX session and free memory.
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
      this.isLoaded = false;
      logger.info("ONNX session released");
    }
  }

  get loaded(): boolean {
    return this.isLoaded;
  }

  get modelVersion(): string {
    return this.config.version;
  }
}

/**
 * Compute softmax probabilities from raw logits.
 */
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxLogit));
  const sumExp = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sumExp);
}
