/**
 * Core types for the Warp Protocol scanner package.
 */

export interface SolanaTransactionMeta {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: unknown | null;
  fee: number;
  preBalances: number[];
  postBalances: number[];
  logMessages: string[];
  innerInstructions: InnerInstruction[];
}

export interface InnerInstruction {
  index: number;
  instructions: CompiledInstruction[];
}

export interface CompiledInstruction {
  programIdIndex: number;
  accounts: number[];
  data: string;
}

export type SignalCategory =
  | "timing"
  | "frequency"
  | "program_interaction"
  | "balance_pattern"
  | "instruction_complexity"
  | "account_graph"
  | "error_pattern";

export interface AgentSignal {
  address: string;
  category: SignalCategory;
  name: string;
  value: number;
  slot: number;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ScanResult {
  address: string;
  signals: AgentSignal[];
  transactionCount: number;
  firstSeen: number;
  lastSeen: number;
  slotRange: [number, number];
  scanDurationMs: number;
}

export interface ListenerConfig {
  rpcUrl: string;
  wsUrl: string;
  commitment: "processed" | "confirmed" | "finalized";
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
  batchSize: number;
  programIds: string[];
}

export interface ScannerOptions {
  listener: ListenerConfig;
  signalExtractors: SignalExtractorFn[];
  lookbackSlots: number;
  minTransactionCount: number;
}

export type SignalExtractorFn = (
  address: string,
  transactions: SolanaTransactionMeta[]
) => AgentSignal[];

export interface ScannerEvents {
  signal: (signal: AgentSignal) => void;
  scanComplete: (result: ScanResult) => void;
  error: (error: Error) => void;
  connected: () => void;
  disconnected: () => void;
  reconnecting: (attempt: number) => void;
}
