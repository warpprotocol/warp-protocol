import type {
  AgentSignal,
  SignalCategory,
  SolanaTransactionMeta,
} from "./types";

/**
 * Extract timing-related signals from a set of transactions.
 * Measures inter-transaction intervals, regularity of timing,
 * and burst detection to identify automated behavior patterns.
 */
export function extractTimingSignals(
  address: string,
  transactions: SolanaTransactionMeta[]
): AgentSignal[] {
  const signals: AgentSignal[] = [];
  if (transactions.length < 2) return signals;

  const sorted = [...transactions].sort(
    (a, b) => (a.blockTime || 0) - (b.blockTime || 0)
  );

  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].blockTime || 0;
    const curr = sorted[i].blockTime || 0;
    if (prev > 0 && curr > 0) {
      intervals.push(curr - prev);
    }
  }

  if (intervals.length === 0) return signals;

  const meanInterval =
    intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
  const variance =
    intervals.reduce((sum, v) => sum + Math.pow(v - meanInterval, 2), 0) /
    intervals.length;
  const stdDev = Math.sqrt(variance);
  const coeffOfVariation = meanInterval > 0 ? stdDev / meanInterval : 0;

  signals.push(
    buildSignal(address, "timing", "mean_tx_interval", meanInterval, sorted),
    buildSignal(address, "timing", "interval_std_dev", stdDev, sorted),
    buildSignal(
      address,
      "timing",
      "interval_coeff_variation",
      coeffOfVariation,
      sorted
    )
  );

  // Detect bursts: clusters of transactions within a short window
  const burstThreshold = 5; // seconds
  let burstCount = 0;
  let maxBurstSize = 0;
  let currentBurst = 1;

  for (const interval of intervals) {
    if (interval <= burstThreshold) {
      currentBurst++;
    } else {
      if (currentBurst > 1) burstCount++;
      maxBurstSize = Math.max(maxBurstSize, currentBurst);
      currentBurst = 1;
    }
  }
  if (currentBurst > 1) burstCount++;
  maxBurstSize = Math.max(maxBurstSize, currentBurst);

  signals.push(
    buildSignal(address, "timing", "burst_count", burstCount, sorted),
    buildSignal(address, "timing", "max_burst_size", maxBurstSize, sorted)
  );

  return signals;
}

/**
 * Extract frequency signals measuring how often an address transacts
 * across different time windows (1h, 6h, 24h).
 */
export function extractFrequencySignals(
  address: string,
  transactions: SolanaTransactionMeta[]
): AgentSignal[] {
  const signals: AgentSignal[] = [];
  if (transactions.length === 0) return signals;

  const now = Date.now() / 1000;
  const windows = [
    { name: "tx_frequency_1h", seconds: 3600 },
    { name: "tx_frequency_6h", seconds: 21600 },
    { name: "tx_frequency_24h", seconds: 86400 },
  ];

  const sorted = [...transactions].sort(
    (a, b) => (a.blockTime || 0) - (b.blockTime || 0)
  );

  for (const window of windows) {
    const cutoff = now - window.seconds;
    const count = transactions.filter(
      (tx) => (tx.blockTime || 0) >= cutoff
    ).length;
    const rate = count / (window.seconds / 3600);

    signals.push(buildSignal(address, "frequency", window.name, rate, sorted));
  }

  signals.push(
    buildSignal(
      address,
      "frequency",
      "total_tx_count",
      transactions.length,
      sorted
    )
  );

  return signals;
}

/**
 * Extract signals from transaction error patterns.
 * High error rates or specific error types can indicate bot behavior.
 */
export function extractErrorPatternSignals(
  address: string,
  transactions: SolanaTransactionMeta[]
): AgentSignal[] {
  const signals: AgentSignal[] = [];
  if (transactions.length === 0) return signals;

  const sorted = [...transactions].sort(
    (a, b) => (a.blockTime || 0) - (b.blockTime || 0)
  );

  const errorCount = transactions.filter((tx) => tx.err !== null).length;
  const errorRate = errorCount / transactions.length;

  signals.push(
    buildSignal(address, "error_pattern", "error_rate", errorRate, sorted),
    buildSignal(address, "error_pattern", "error_count", errorCount, sorted)
  );

  // Check for consecutive errors (retry pattern)
  let maxConsecutiveErrors = 0;
  let currentStreak = 0;

  for (const tx of sorted) {
    if (tx.err !== null) {
      currentStreak++;
      maxConsecutiveErrors = Math.max(maxConsecutiveErrors, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  signals.push(
    buildSignal(
      address,
      "error_pattern",
      "max_consecutive_errors",
      maxConsecutiveErrors,
      sorted
    )
  );

  return signals;
}

/**
 * Extract balance movement patterns from pre/post balance data.
 */
export function extractBalanceSignals(
  address: string,
  transactions: SolanaTransactionMeta[]
): AgentSignal[] {
  const signals: AgentSignal[] = [];
  if (transactions.length === 0) return signals;

  const sorted = [...transactions].sort(
    (a, b) => (a.blockTime || 0) - (b.blockTime || 0)
  );

  const feeValues = transactions.map((tx) => tx.fee);
  const meanFee =
    feeValues.reduce((sum, v) => sum + v, 0) / feeValues.length;

  signals.push(
    buildSignal(address, "balance_pattern", "mean_fee", meanFee, sorted)
  );

  const balanceDeltas = transactions.map((tx) => {
    if (tx.preBalances.length > 0 && tx.postBalances.length > 0) {
      return tx.postBalances[0] - tx.preBalances[0];
    }
    return 0;
  });

  const meanDelta =
    balanceDeltas.reduce((sum, v) => sum + v, 0) / balanceDeltas.length;

  signals.push(
    buildSignal(
      address,
      "balance_pattern",
      "mean_balance_delta",
      meanDelta,
      sorted
    )
  );

  return signals;
}

function buildSignal(
  address: string,
  category: SignalCategory,
  name: string,
  value: number,
  sortedTxs: SolanaTransactionMeta[]
): AgentSignal {
  const lastTx = sortedTxs[sortedTxs.length - 1];
  return {
    address,
    category,
    name,
    value,
    slot: lastTx.slot,
    timestamp: lastTx.blockTime || Date.now() / 1000,
    metadata: {},
  };
}
