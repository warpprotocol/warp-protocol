# Dataset Format

This directory contains the labeled dataset used for training the Warp Protocol
agent classifier.

## File Format

The dataset is stored as a Parquet file: `agents_labeled.parquet`

A CSV alternative (`agents_labeled.csv`) may also be provided for convenience.

## Schema

Each row represents a single agent address with its extracted behavioral features
and a human-assigned label.

| Column | Type | Description |
|--------|------|-------------|
| address | string | Solana public key of the agent |
| label | string | One of: AUTONOMOUS, HYBRID, HUMAN |
| labeled_by | string | Identifier of the labeler |
| labeled_at | timestamp | When the label was assigned |
| timing_mean_interval | float32 | Mean interval between transactions (seconds) |
| timing_interval_stddev | float32 | Standard deviation of transaction intervals |
| timing_interval_cv | float32 | Coefficient of variation of intervals |
| timing_burst_count | float32 | Number of detected transaction bursts |
| timing_max_burst_size | float32 | Largest burst size observed |
| timing_periodicity_score | float32 | Score from 0 to 1 indicating timing regularity |
| timing_night_ratio | float32 | Fraction of transactions during 00:00 to 06:00 UTC |
| timing_weekend_ratio | float32 | Fraction of transactions on weekends |
| freq_tx_per_hour_1h | float32 | Transaction rate in the most recent hour |
| freq_tx_per_hour_6h | float32 | Transaction rate over the last 6 hours |
| freq_tx_per_hour_24h | float32 | Transaction rate over the last 24 hours |
| freq_total_tx_count | float32 | Total number of transactions observed |
| freq_active_hours_count | float32 | Number of distinct active hours |
| freq_active_days_count | float32 | Number of distinct active days |
| prog_unique_programs_invoked | float32 | Count of unique programs called |
| prog_dominant_program_ratio | float32 | Fraction of calls to the most-used program |
| prog_cpi_depth_mean | float32 | Mean cross-program invocation depth |
| prog_cpi_depth_max | float32 | Maximum CPI depth observed |
| prog_known_dex_ratio | float32 | Fraction of interactions with known DEXes |
| prog_known_lending_ratio | float32 | Fraction of interactions with lending protocols |
| prog_system_program_ratio | float32 | Fraction of system program calls |
| bal_mean_fee | float32 | Mean transaction fee (lamports) |
| bal_fee_stddev | float32 | Standard deviation of fees |
| bal_mean_sol_delta | float32 | Mean SOL balance change per transaction |
| bal_sol_delta_stddev | float32 | Standard deviation of SOL balance changes |
| bal_token_transfer_count | float32 | Number of SPL token transfers |
| bal_unique_token_mints | float32 | Number of unique token mints transferred |
| ix_mean_instruction_count | float32 | Mean instructions per transaction |
| ix_max_instruction_count | float32 | Maximum instructions in a single transaction |
| ix_mean_inner_ix_count | float32 | Mean inner (CPI) instructions per transaction |
| ix_unique_instruction_data_hashes | float32 | Count of unique instruction data patterns |
| ix_data_entropy_mean | float32 | Mean Shannon entropy of instruction data |
| ix_data_length_mean | float32 | Mean byte length of instruction data |
| ix_data_length_stddev | float32 | Standard deviation of instruction data length |
| graph_unique_counterparties | float32 | Number of unique interacting addresses |
| graph_repeat_counterparty_ratio | float32 | Fraction of counterparties seen more than once |
| graph_self_transfer_ratio | float32 | Fraction of self-transfers |
| graph_funding_source_count | float32 | Number of distinct funding sources |
| graph_fan_out_degree | float32 | Outgoing transfer degree |
| graph_fan_in_degree | float32 | Incoming transfer degree |
| graph_clustering_coefficient | float32 | Local clustering coefficient of the account graph |
| err_error_rate | float32 | Fraction of transactions that failed |
| err_total_errors | float32 | Total count of failed transactions |
| err_max_consecutive_errors | float32 | Longest streak of consecutive failures |
| err_retry_pattern_score | float32 | Score indicating systematic retry behavior |
| err_slippage_error_ratio | float32 | Fraction of errors caused by slippage limits |
| err_compute_exceeded_ratio | float32 | Fraction of errors from compute budget overflows |

## Labeling Guidelines

- **AUTONOMOUS**: No evidence of human decision-making. Transactions follow strict
  patterns, timing is highly regular, and behavior is consistent with a program
  executing predefined logic.

- **HYBRID**: Shows a mix of automated and manual behavior. May use bots for
  execution but with human-directed strategy changes, irregular timing patterns
  interspersed with regular ones.

- **HUMAN**: Transaction patterns are consistent with manual wallet usage.
  Irregular timing, varied program interactions, low periodicity scores.

## Dataset Statistics (v4)

- Total samples: 8,247
- AUTONOMOUS: 3,102 (37.6%)
- HYBRID: 2,418 (29.3%)
- HUMAN: 2,727 (33.1%)
- Collection period: 2025-10-01 to 2026-03-15
