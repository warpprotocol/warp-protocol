/**
 * Public types for the Warp Protocol SDK.
 */

export type AgentVerdict = "AUTONOMOUS" | "HYBRID" | "HUMAN" | "INSUFFICIENT_DATA";

export interface VerdictResponse {
  address: string;
  verdict: AgentVerdict;
  confidence: number;
  reasons: VerdictReasonInfo[];
  signalCount: number;
  transactionCount: number;
  timestamp: number;
  cached: boolean;
}

export interface VerdictReasonInfo {
  code: string;
  description: string;
  weight: number;
  featureContribution: number;
}

export interface BatchQueryRequest {
  addresses: string[];
  options?: BatchQueryOptions;
}

export interface BatchQueryOptions {
  skipCache?: boolean;
  includeReasons?: boolean;
}

export interface BatchQueryResponse {
  results: VerdictResponse[];
  errors: Array<{ address: string; error: string }>;
  meta: {
    total: number;
    succeeded: number;
    failed: number;
    latencyMs: number;
  };
}

export interface WarpClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export interface FeedMessage {
  type: "verdict" | "subscribed" | "subscribed_all" | "unsubscribed" | "pong" | "error";
  data?: unknown;
  message?: string;
  addresses?: string[];
  timestamp?: number;
}

export type VerdictCallback = (verdict: VerdictResponse) => void;
