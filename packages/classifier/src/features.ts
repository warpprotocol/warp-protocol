import type { AgentSignal } from "@warp-protocol/scanner";
import type { FeatureVector } from "./types";

/**
 * The 47 behavioral features used by the Warp Protocol classifier.
 * Organized into categories: timing (8), frequency (6), program interaction (7),
 * balance patterns (6), instruction complexity (7), account graph (7), error patterns (6).
 */
export const FEATURE_NAMES: string[] = [
  // Timing features (0-7)
  "timing_mean_interval",
  "timing_interval_stddev",
  "timing_interval_cv",
  "timing_burst_count",
  "timing_max_burst_size",
  "timing_periodicity_score",
  "timing_night_ratio",
  "timing_weekend_ratio",

  // Frequency features (8-13)
  "freq_tx_per_hour_1h",
  "freq_tx_per_hour_6h",
  "freq_tx_per_hour_24h",
  "freq_total_tx_count",
  "freq_active_hours_count",
  "freq_active_days_count",

  // Program interaction features (14-20)
  "prog_unique_programs_invoked",
  "prog_dominant_program_ratio",
  "prog_cpi_depth_mean",
  "prog_cpi_depth_max",
  "prog_known_dex_ratio",
  "prog_known_lending_ratio",
  "prog_system_program_ratio",

  // Balance pattern features (21-26)
  "bal_mean_fee",
  "bal_fee_stddev",
  "bal_mean_sol_delta",
  "bal_sol_delta_stddev",
  "bal_token_transfer_count",
  "bal_unique_token_mints",

  // Instruction complexity features (27-33)
  "ix_mean_instruction_count",
  "ix_max_instruction_count",
  "ix_mean_inner_ix_count",
  "ix_unique_instruction_data_hashes",
  "ix_data_entropy_mean",
  "ix_data_length_mean",
  "ix_data_length_stddev",

  // Account graph features (34-40)
  "graph_unique_counterparties",
  "graph_repeat_counterparty_ratio",
  "graph_self_transfer_ratio",
  "graph_funding_source_count",
  "graph_fan_out_degree",
  "graph_fan_in_degree",
  "graph_clustering_coefficient",

  // Error pattern features (41-46)
  "err_error_rate",
  "err_total_errors",
  "err_max_consecutive_errors",
  "err_retry_pattern_score",
  "err_slippage_error_ratio",
  "err_compute_exceeded_ratio",
];

/**
 * Extract the full 47-dimensional feature vector from a set of agent signals.
 * Missing features are filled with zero.
 */
export function extractFeatures(
  address: string,
  signals: AgentSignal[]
): FeatureVector {
  const values = new Float32Array(FEATURE_NAMES.length);

  const signalMap = new Map<string, number>();
  for (const s of signals) {
    signalMap.set(s.name, s.value);
  }

  // Timing features
  values[0] = extractTimingMeanInterval(signals);
  values[1] = extractTimingIntervalStddev(signals);
  values[2] = extractTimingIntervalCV(signals);
  values[3] = signalMap.get("burst_count") ?? 0;
  values[4] = signalMap.get("max_burst_size") ?? 0;
  values[5] = extractPeriodicityScore(signals);
  values[6] = extractNightRatio(signals);
  values[7] = extractWeekendRatio(signals);

  // Frequency features
  values[8] = signalMap.get("tx_frequency_1h") ?? 0;
  values[9] = signalMap.get("tx_frequency_6h") ?? 0;
  values[10] = signalMap.get("tx_frequency_24h") ?? 0;
  values[11] = signalMap.get("total_tx_count") ?? 0;
  values[12] = extractActiveHoursCount(signals);
  values[13] = extractActiveDaysCount(signals);

  // Program interaction features
  values[14] = extractUniqueProgramsInvoked(signals);
  values[15] = extractDominantProgramRatio(signals);
  values[16] = extractCpiDepthMean(signals);
  values[17] = extractCpiDepthMax(signals);
  values[18] = extractKnownDexRatio(signals);
  values[19] = extractKnownLendingRatio(signals);
  values[20] = extractSystemProgramRatio(signals);

  // Balance features
  values[21] = signalMap.get("mean_fee") ?? 0;
  values[22] = extractFeeStddev(signals);
  values[23] = signalMap.get("mean_balance_delta") ?? 0;
  values[24] = extractSolDeltaStddev(signals);
  values[25] = extractTokenTransferCount(signals);
  values[26] = extractUniqueTokenMints(signals);

  // Instruction complexity features
  values[27] = extractMeanInstructionCount(signals);
  values[28] = extractMaxInstructionCount(signals);
  values[29] = extractMeanInnerIxCount(signals);
  values[30] = extractUniqueInstructionDataHashes(signals);
  values[31] = extractDataEntropyMean(signals);
  values[32] = extractDataLengthMean(signals);
  values[33] = extractDataLengthStddev(signals);

  // Account graph features
  values[34] = extractUniqueCounterparties(signals);
  values[35] = extractRepeatCounterpartyRatio(signals);
  values[36] = extractSelfTransferRatio(signals);
  values[37] = extractFundingSourceCount(signals);
  values[38] = extractFanOutDegree(signals);
  values[39] = extractFanInDegree(signals);
  values[40] = extractClusteringCoefficient(signals);

  // Error features
  values[41] = signalMap.get("error_rate") ?? 0;
  values[42] = signalMap.get("error_count") ?? 0;
  values[43] = signalMap.get("max_consecutive_errors") ?? 0;
  values[44] = extractRetryPatternScore(signals);
  values[45] = extractSlippageErrorRatio(signals);
  values[46] = extractComputeExceededRatio(signals);

  return {
    values,
    featureNames: FEATURE_NAMES,
    address,
    extractedAt: Date.now(),
  };
}

// ---- Timing feature extractors ----

function extractTimingMeanInterval(signals: AgentSignal[]): number {
  const s = signals.find((s) => s.name === "mean_tx_interval");
  return s?.value ?? 0;
}

function extractTimingIntervalStddev(signals: AgentSignal[]): number {
  const s = signals.find((s) => s.name === "interval_std_dev");
  return s?.value ?? 0;
}

function extractTimingIntervalCV(signals: AgentSignal[]): number {
  const s = signals.find((s) => s.name === "interval_coeff_variation");
  return s?.value ?? 0;
}

function extractPeriodicityScore(signals: AgentSignal[]): number {
  const timingSignals = signals.filter((s) => s.category === "timing");
  if (timingSignals.length < 3) return 0;

  const cv = timingSignals.find(
    (s) => s.name === "interval_coeff_variation"
  )?.value;
  if (cv === undefined) return 0;

  // Low CV indicates high periodicity. Score is inversely proportional.
  return Math.max(0, 1 - cv);
}

function extractNightRatio(signals: AgentSignal[]): number {
  const timingSignals = signals.filter((s) => s.category === "timing");
  if (timingSignals.length === 0) return 0;

  let nightCount = 0;
  let totalCount = 0;
  for (const s of timingSignals) {
    const hour = new Date(s.timestamp * 1000).getUTCHours();
    totalCount++;
    if (hour >= 0 && hour < 6) nightCount++;
  }

  return totalCount > 0 ? nightCount / totalCount : 0;
}

function extractWeekendRatio(signals: AgentSignal[]): number {
  const timingSignals = signals.filter((s) => s.category === "timing");
  if (timingSignals.length === 0) return 0;

  let weekendCount = 0;
  for (const s of timingSignals) {
    const day = new Date(s.timestamp * 1000).getUTCDay();
    if (day === 0 || day === 6) weekendCount++;
  }

  return weekendCount / timingSignals.length;
}

// ---- Frequency feature extractors ----

function extractActiveHoursCount(signals: AgentSignal[]): number {
  const hours = new Set<number>();
  for (const s of signals) {
    hours.add(new Date(s.timestamp * 1000).getUTCHours());
  }
  return hours.size;
}

function extractActiveDaysCount(signals: AgentSignal[]): number {
  const days = new Set<string>();
  for (const s of signals) {
    days.add(new Date(s.timestamp * 1000).toISOString().slice(0, 10));
  }
  return days.size;
}

// ---- Program interaction feature extractors ----

function extractUniqueProgramsInvoked(signals: AgentSignal[]): number {
  const programs = new Set<string>();
  for (const s of signals.filter((s) => s.category === "program_interaction")) {
    const pid = s.metadata["programId"] as string | undefined;
    if (pid) programs.add(pid);
  }
  return programs.size;
}

function extractDominantProgramRatio(signals: AgentSignal[]): number {
  const progCounts = new Map<string, number>();
  const progSignals = signals.filter(
    (s) => s.category === "program_interaction"
  );
  for (const s of progSignals) {
    const pid = (s.metadata["programId"] as string) || "unknown";
    progCounts.set(pid, (progCounts.get(pid) || 0) + 1);
  }
  if (progCounts.size === 0) return 0;
  const maxCount = Math.max(...progCounts.values());
  return maxCount / progSignals.length;
}

function extractCpiDepthMean(signals: AgentSignal[]): number {
  const depths = signals
    .filter((s) => s.name === "cpi_depth")
    .map((s) => s.value);
  if (depths.length === 0) return 0;
  return depths.reduce((a, b) => a + b, 0) / depths.length;
}

function extractCpiDepthMax(signals: AgentSignal[]): number {
  const depths = signals
    .filter((s) => s.name === "cpi_depth")
    .map((s) => s.value);
  return depths.length > 0 ? Math.max(...depths) : 0;
}

function extractKnownDexRatio(signals: AgentSignal[]): number {
  const KNOWN_DEXES = new Set([
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
  ]);
  const progSignals = signals.filter(
    (s) => s.category === "program_interaction"
  );
  if (progSignals.length === 0) return 0;
  const dexCount = progSignals.filter((s) =>
    KNOWN_DEXES.has((s.metadata["programId"] as string) || "")
  ).length;
  return dexCount / progSignals.length;
}

function extractKnownLendingRatio(signals: AgentSignal[]): number {
  const KNOWN_LENDING = new Set([
    "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo",
    "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  ]);
  const progSignals = signals.filter(
    (s) => s.category === "program_interaction"
  );
  if (progSignals.length === 0) return 0;
  const lendCount = progSignals.filter((s) =>
    KNOWN_LENDING.has((s.metadata["programId"] as string) || "")
  ).length;
  return lendCount / progSignals.length;
}

function extractSystemProgramRatio(signals: AgentSignal[]): number {
  const SYSTEM = "11111111111111111111111111111111";
  const progSignals = signals.filter(
    (s) => s.category === "program_interaction"
  );
  if (progSignals.length === 0) return 0;
  const sysCount = progSignals.filter(
    (s) => (s.metadata["programId"] as string) === SYSTEM
  ).length;
  return sysCount / progSignals.length;
}

// ---- Balance feature extractors ----

function extractFeeStddev(signals: AgentSignal[]): number {
  const fees = signals.filter((s) => s.name === "fee_value").map((s) => s.value);
  if (fees.length < 2) return 0;
  const mean = fees.reduce((a, b) => a + b, 0) / fees.length;
  const variance =
    fees.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / fees.length;
  return Math.sqrt(variance);
}

function extractSolDeltaStddev(signals: AgentSignal[]): number {
  const deltas = signals
    .filter((s) => s.name === "sol_delta")
    .map((s) => s.value);
  if (deltas.length < 2) return 0;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const variance =
    deltas.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / deltas.length;
  return Math.sqrt(variance);
}

function extractTokenTransferCount(signals: AgentSignal[]): number {
  return signals.filter((s) => s.name === "token_transfer").length;
}

function extractUniqueTokenMints(signals: AgentSignal[]): number {
  const mints = new Set<string>();
  for (const s of signals.filter((s) => s.name === "token_transfer")) {
    const mint = s.metadata["mint"] as string | undefined;
    if (mint) mints.add(mint);
  }
  return mints.size;
}

// ---- Instruction complexity feature extractors ----

function extractMeanInstructionCount(signals: AgentSignal[]): number {
  const counts = signals
    .filter((s) => s.name === "instruction_count")
    .map((s) => s.value);
  if (counts.length === 0) return 0;
  return counts.reduce((a, b) => a + b, 0) / counts.length;
}

function extractMaxInstructionCount(signals: AgentSignal[]): number {
  const counts = signals
    .filter((s) => s.name === "instruction_count")
    .map((s) => s.value);
  return counts.length > 0 ? Math.max(...counts) : 0;
}

function extractMeanInnerIxCount(signals: AgentSignal[]): number {
  const counts = signals
    .filter((s) => s.name === "inner_instruction_count")
    .map((s) => s.value);
  if (counts.length === 0) return 0;
  return counts.reduce((a, b) => a + b, 0) / counts.length;
}

function extractUniqueInstructionDataHashes(signals: AgentSignal[]): number {
  const hashes = new Set<string>();
  for (const s of signals.filter((s) => s.name === "ix_data_hash")) {
    const hash = s.metadata["hash"] as string | undefined;
    if (hash) hashes.add(hash);
  }
  return hashes.size;
}

function extractDataEntropyMean(signals: AgentSignal[]): number {
  const entropies = signals
    .filter((s) => s.name === "ix_data_entropy")
    .map((s) => s.value);
  if (entropies.length === 0) return 0;
  return entropies.reduce((a, b) => a + b, 0) / entropies.length;
}

function extractDataLengthMean(signals: AgentSignal[]): number {
  const lengths = signals
    .filter((s) => s.name === "ix_data_length")
    .map((s) => s.value);
  if (lengths.length === 0) return 0;
  return lengths.reduce((a, b) => a + b, 0) / lengths.length;
}

function extractDataLengthStddev(signals: AgentSignal[]): number {
  const lengths = signals
    .filter((s) => s.name === "ix_data_length")
    .map((s) => s.value);
  if (lengths.length < 2) return 0;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / lengths.length;
  return Math.sqrt(variance);
}

// ---- Account graph feature extractors ----

function extractUniqueCounterparties(signals: AgentSignal[]): number {
  const parties = new Set<string>();
  for (const s of signals.filter((s) => s.category === "account_graph")) {
    const cp = s.metadata["counterparty"] as string | undefined;
    if (cp) parties.add(cp);
  }
  return parties.size;
}

function extractRepeatCounterpartyRatio(signals: AgentSignal[]): number {
  const cpCounts = new Map<string, number>();
  for (const s of signals.filter((s) => s.category === "account_graph")) {
    const cp = (s.metadata["counterparty"] as string) || "unknown";
    cpCounts.set(cp, (cpCounts.get(cp) || 0) + 1);
  }
  if (cpCounts.size === 0) return 0;
  const repeats = [...cpCounts.values()].filter((c) => c > 1).length;
  return repeats / cpCounts.size;
}

function extractSelfTransferRatio(signals: AgentSignal[]): number {
  const graphSignals = signals.filter((s) => s.category === "account_graph");
  if (graphSignals.length === 0) return 0;
  const selfCount = graphSignals.filter(
    (s) => s.metadata["isSelfTransfer"] === true
  ).length;
  return selfCount / graphSignals.length;
}

function extractFundingSourceCount(signals: AgentSignal[]): number {
  const sources = new Set<string>();
  for (const s of signals.filter((s) => s.name === "funding_source")) {
    const src = s.metadata["source"] as string | undefined;
    if (src) sources.add(src);
  }
  return sources.size;
}

function extractFanOutDegree(signals: AgentSignal[]): number {
  const outgoing = new Set<string>();
  for (const s of signals.filter((s) => s.name === "outgoing_transfer")) {
    const dest = s.metadata["destination"] as string | undefined;
    if (dest) outgoing.add(dest);
  }
  return outgoing.size;
}

function extractFanInDegree(signals: AgentSignal[]): number {
  const incoming = new Set<string>();
  for (const s of signals.filter((s) => s.name === "incoming_transfer")) {
    const src = s.metadata["source"] as string | undefined;
    if (src) incoming.add(src);
  }
  return incoming.size;
}

function extractClusteringCoefficient(signals: AgentSignal[]): number {
  // Simplified clustering coefficient based on counterparty overlap
  const cpPairs = new Set<string>();
  const cps = signals
    .filter((s) => s.category === "account_graph")
    .map((s) => s.metadata["counterparty"] as string)
    .filter(Boolean);

  for (let i = 0; i < cps.length; i++) {
    for (let j = i + 1; j < Math.min(i + 10, cps.length); j++) {
      const pair = [cps[i], cps[j]].sort().join(":");
      cpPairs.add(pair);
    }
  }

  const uniqueCps = new Set(cps).size;
  const maxPairs = (uniqueCps * (uniqueCps - 1)) / 2;
  return maxPairs > 0 ? cpPairs.size / maxPairs : 0;
}

// ---- Error feature extractors ----

function extractRetryPatternScore(signals: AgentSignal[]): number {
  const errorSignals = signals.filter((s) => s.category === "error_pattern");
  if (errorSignals.length < 2) return 0;

  const consecutiveErrors =
    errorSignals.find((s) => s.name === "max_consecutive_errors")?.value ?? 0;
  const errorRate =
    errorSignals.find((s) => s.name === "error_rate")?.value ?? 0;

  // High consecutive errors combined with moderate overall error rate
  // suggests retry behavior
  return Math.min(1, (consecutiveErrors / 5) * 0.6 + errorRate * 0.4);
}

function extractSlippageErrorRatio(signals: AgentSignal[]): number {
  const errorSignals = signals.filter((s) => s.category === "error_pattern");
  if (errorSignals.length === 0) return 0;
  const slippageCount = errorSignals.filter(
    (s) => s.metadata["errorType"] === "slippage_exceeded"
  ).length;
  return slippageCount / errorSignals.length;
}

function extractComputeExceededRatio(signals: AgentSignal[]): number {
  const errorSignals = signals.filter((s) => s.category === "error_pattern");
  if (errorSignals.length === 0) return 0;
  const computeCount = errorSignals.filter(
    (s) => s.metadata["errorType"] === "compute_budget_exceeded"
  ).length;
  return computeCount / errorSignals.length;
}
