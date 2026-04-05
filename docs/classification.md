# Classification Features

The Warp Protocol classifier uses 47 behavioral features extracted from on-chain
transaction data. Features are organized into 7 categories.

## Category 1: Timing (8 features)

Features that measure the temporal patterns of an agent's transactions.

| # | Feature | Description |
|---|---------|-------------|
| 0 | timing_mean_interval | Mean time between consecutive transactions (seconds) |
| 1 | timing_interval_stddev | Standard deviation of inter-transaction intervals |
| 2 | timing_interval_cv | Coefficient of variation (stddev / mean) of intervals |
| 3 | timing_burst_count | Number of transaction bursts (clusters within 5s windows) |
| 4 | timing_max_burst_size | Size of the largest detected burst |
| 5 | timing_periodicity_score | Score from 0 to 1 indicating regularity of timing |
| 6 | timing_night_ratio | Fraction of transactions between 00:00 and 06:00 UTC |
| 7 | timing_weekend_ratio | Fraction of transactions on Saturday and Sunday |

**Interpretation:** Autonomous agents typically show low timing_interval_cv (regular
intervals), high periodicity_score, and high night_ratio (24/7 operation). Human
wallets show high interval_cv and lower night activity.

## Category 2: Frequency (6 features)

Features measuring transaction volume across different time windows.

| # | Feature | Description |
|---|---------|-------------|
| 8 | freq_tx_per_hour_1h | Transactions per hour in the most recent 1-hour window |
| 9 | freq_tx_per_hour_6h | Transactions per hour over the last 6 hours |
| 10 | freq_tx_per_hour_24h | Transactions per hour over the last 24 hours |
| 11 | freq_total_tx_count | Total observed transaction count |
| 12 | freq_active_hours_count | Number of distinct UTC hours with activity |
| 13 | freq_active_days_count | Number of distinct calendar days with activity |

**Interpretation:** High sustained tx rates suggest automation. Humans tend to have
fewer active hours and lower, spikier transaction rates.

## Category 3: Program Interaction (7 features)

Features describing which Solana programs the agent interacts with and how.

| # | Feature | Description |
|---|---------|-------------|
| 14 | prog_unique_programs_invoked | Count of distinct programs called |
| 15 | prog_dominant_program_ratio | Fraction of calls to the single most-used program |
| 16 | prog_cpi_depth_mean | Mean cross-program invocation depth per transaction |
| 17 | prog_cpi_depth_max | Maximum CPI depth observed |
| 18 | prog_known_dex_ratio | Fraction of interactions with known DEX programs |
| 19 | prog_known_lending_ratio | Fraction of interactions with lending protocols |
| 20 | prog_system_program_ratio | Fraction of calls to the System Program |

**Interpretation:** Bots often have a high dominant_program_ratio (specialized use)
and high known_dex_ratio. Human wallets interact with a wider variety of programs.

## Category 4: Balance Patterns (6 features)

Features derived from SOL and token balance changes across transactions.

| # | Feature | Description |
|---|---------|-------------|
| 21 | bal_mean_fee | Mean transaction fee in lamports |
| 22 | bal_fee_stddev | Standard deviation of transaction fees |
| 23 | bal_mean_sol_delta | Mean SOL balance change per transaction |
| 24 | bal_sol_delta_stddev | Standard deviation of SOL balance changes |
| 25 | bal_token_transfer_count | Total number of SPL token transfer instructions |
| 26 | bal_unique_token_mints | Count of unique token mints involved in transfers |

**Interpretation:** Automated agents often use priority fees (higher mean_fee) and
show consistent balance deltas. Humans interact with more diverse token mints.

## Category 5: Instruction Complexity (7 features)

Features measuring the structure and content of transaction instructions.

| # | Feature | Description |
|---|---------|-------------|
| 27 | ix_mean_instruction_count | Mean number of instructions per transaction |
| 28 | ix_max_instruction_count | Maximum instructions observed in a single transaction |
| 29 | ix_mean_inner_ix_count | Mean number of inner (CPI-generated) instructions |
| 30 | ix_unique_instruction_data_hashes | Count of unique instruction data patterns |
| 31 | ix_data_entropy_mean | Mean Shannon entropy of instruction data bytes |
| 32 | ix_data_length_mean | Mean byte length of instruction data |
| 33 | ix_data_length_stddev | Standard deviation of instruction data length |

**Interpretation:** Bots tend to produce repetitive instruction patterns (low
unique_instruction_data_hashes relative to tx count) with consistent data lengths.

## Category 6: Account Graph (7 features)

Features describing the network of addresses the agent interacts with.

| # | Feature | Description |
|---|---------|-------------|
| 34 | graph_unique_counterparties | Number of distinct addresses interacted with |
| 35 | graph_repeat_counterparty_ratio | Fraction of counterparties seen more than once |
| 36 | graph_self_transfer_ratio | Fraction of transactions that are self-transfers |
| 37 | graph_funding_source_count | Number of distinct addresses that funded this agent |
| 38 | graph_fan_out_degree | Number of unique outgoing transfer destinations |
| 39 | graph_fan_in_degree | Number of unique incoming transfer sources |
| 40 | graph_clustering_coefficient | Local clustering coefficient of the account graph |

**Interpretation:** Automated agents often interact with a smaller set of
counterparties repeatedly (high repeat_counterparty_ratio). Self-transfers and
single funding sources are common in bot wallets.

## Category 7: Error Patterns (6 features)

Features derived from transaction failure behavior.

| # | Feature | Description |
|---|---------|-------------|
| 41 | err_error_rate | Fraction of all transactions that failed |
| 42 | err_total_errors | Absolute count of failed transactions |
| 43 | err_max_consecutive_errors | Longest streak of consecutive failures |
| 44 | err_retry_pattern_score | Score indicating systematic retry behavior (0 to 1) |
| 45 | err_slippage_error_ratio | Fraction of errors caused by slippage tolerance exceeded |
| 46 | err_compute_exceeded_ratio | Fraction of errors from compute budget overflows |

**Interpretation:** Automated trading bots often show high retry_pattern_score and
slippage_error_ratio due to failed swap attempts. Human wallets typically have
lower error rates with no systematic retry patterns.

## Feature Normalization

All features are standardized (zero mean, unit variance) before model inference.
The scaler parameters are computed from the training dataset and applied at
inference time. Raw feature values are stored alongside the normalized vector
for interpretability.

## Feature Importance (Model v4)

Top 10 most important features by SHAP value magnitude:

1. timing_periodicity_score
2. graph_repeat_counterparty_ratio
3. timing_interval_cv
4. err_retry_pattern_score
5. prog_dominant_program_ratio
6. freq_tx_per_hour_1h
7. graph_clustering_coefficient
8. timing_burst_count
9. freq_active_hours_count
10. ix_unique_instruction_data_hashes
