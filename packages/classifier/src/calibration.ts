import type { CalibrationParams } from "./types";

/**
 * Default calibration parameters learned from the validation set.
 * These are Platt scaling coefficients (a, b) for each class,
 * where calibrated_prob = 1 / (1 + exp(a * raw_logit + b)).
 */
export const DEFAULT_CALIBRATION: CalibrationParams = {
  autonomous: { a: -1.2847, b: 0.3192 },
  hybrid: { a: -0.9531, b: 0.1847 },
  human: { a: -1.1263, b: 0.2714 },
};

/**
 * Apply Platt scaling to raw softmax probabilities.
 *
 * Platt scaling fits a sigmoid on top of the raw model outputs
 * to produce well-calibrated probabilities. This is especially
 * important when the model's raw confidence does not accurately
 * reflect the true probability of correct classification.
 *
 * @param rawProbs - Array of 3 raw probabilities [AUTONOMOUS, HYBRID, HUMAN]
 * @param params - Platt scaling parameters per class
 * @returns Calibrated probabilities that sum to 1
 */
export function calibrateProbabilities(
  rawProbs: number[],
  params: CalibrationParams
): number[] {
  if (rawProbs.length !== 3) {
    throw new Error(`Expected 3 probabilities, got ${rawProbs.length}`);
  }

  const classes = [params.autonomous, params.hybrid, params.human];

  // Apply Platt scaling sigmoid to each class
  const calibrated = rawProbs.map((prob, i) => {
    const logit = Math.log(prob / (1 - Math.max(prob, 1e-7)));
    return plattSigmoid(logit, classes[i].a, classes[i].b);
  });

  // Renormalize so probabilities sum to 1
  const sum = calibrated.reduce((a, b) => a + b, 0);
  return calibrated.map((p) => p / sum);
}

/**
 * Platt sigmoid function: 1 / (1 + exp(a * f + b))
 * where f is the raw logit and (a, b) are the learned parameters.
 */
function plattSigmoid(logit: number, a: number, b: number): number {
  const exponent = a * logit + b;
  return 1.0 / (1.0 + Math.exp(exponent));
}

/**
 * Compute Expected Calibration Error (ECE) for evaluating
 * how well-calibrated the model's probabilities are.
 * Lower ECE means better calibration.
 *
 * @param predictions - Array of { predicted: number, actual: boolean }
 * @param numBins - Number of bins for the calibration histogram
 * @returns ECE value between 0 and 1
 */
export function computeECE(
  predictions: Array<{ predicted: number; actual: boolean }>,
  numBins: number = 10
): number {
  const bins: Array<{ sumPredicted: number; sumActual: number; count: number }> =
    Array.from({ length: numBins }, () => ({
      sumPredicted: 0,
      sumActual: 0,
      count: 0,
    }));

  for (const pred of predictions) {
    const binIdx = Math.min(
      Math.floor(pred.predicted * numBins),
      numBins - 1
    );
    bins[binIdx].sumPredicted += pred.predicted;
    bins[binIdx].sumActual += pred.actual ? 1 : 0;
    bins[binIdx].count++;
  }

  let ece = 0;
  const total = predictions.length;

  for (const bin of bins) {
    if (bin.count === 0) continue;
    const avgPredicted = bin.sumPredicted / bin.count;
    const avgActual = bin.sumActual / bin.count;
    ece += (bin.count / total) * Math.abs(avgActual - avgPredicted);
  }

  return ece;
}
