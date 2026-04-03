import type {
  WarpClientConfig,
  VerdictResponse,
  BatchQueryRequest,
  BatchQueryResponse,
  VerdictCallback,
} from "./types";

const DEFAULT_CONFIG: Required<WarpClientConfig> = {
  baseUrl: "http://localhost:3100",
  apiKey: "",
  timeoutMs: 10000,
  retries: 3,
  retryDelayMs: 1000,
};

/**
 * WarpClient provides a typed interface for interacting with the
 * Warp Protocol API. It supports single verdict lookups, batch
 * queries, and real-time WebSocket subscriptions.
 */
export class WarpClient {
  private readonly config: Required<WarpClientConfig>;
  private ws: WebSocket | null = null;
  private verdictListeners: Map<string, VerdictCallback[]> = new Map();
  private globalListeners: VerdictCallback[] = [];

  constructor(config: WarpClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the verdict for a single Solana address.
   */
  async getVerdict(address: string): Promise<VerdictResponse> {
    const url = `${this.config.baseUrl}/v1/verdict/${address}`;
    const response = await this.fetchWithRetry(url, { method: "GET" });
    const body = await response.json();

    if (!response.ok) {
      throw new WarpApiError(
        body.error || "UNKNOWN_ERROR",
        body.message || "Request failed",
        response.status
      );
    }

    return body.data as VerdictResponse;
  }

  /**
   * Query verdicts for multiple addresses in a single request.
   * Supports up to 100 addresses per batch.
   */
  async batchQuery(request: BatchQueryRequest): Promise<BatchQueryResponse> {
    if (request.addresses.length > 100) {
      throw new WarpApiError(
        "BATCH_TOO_LARGE",
        "Maximum 100 addresses per batch request",
        400
      );
    }

    const url = `${this.config.baseUrl}/v1/query`;
    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    const body = await response.json();

    if (!response.ok) {
      throw new WarpApiError(
        body.error || "UNKNOWN_ERROR",
        body.message || "Batch query failed",
        response.status
      );
    }

    return body.data as BatchQueryResponse;
  }

  /**
   * Subscribe to real-time verdict updates via WebSocket.
   * Optionally provide specific addresses or subscribe to all.
   */
  subscribeVerdicts(
    addresses: string[] | "all",
    callback: VerdictCallback
  ): void {
    this.ensureWebSocket();

    if (addresses === "all") {
      this.globalListeners.push(callback);
      this.sendWsMessage({ action: "subscribe_all" });
    } else {
      for (const addr of addresses) {
        const listeners = this.verdictListeners.get(addr) || [];
        listeners.push(callback);
        this.verdictListeners.set(addr, listeners);
      }
      this.sendWsMessage({ action: "subscribe", addresses });
    }
  }

  /**
   * Unsubscribe from verdict updates for specific addresses.
   */
  unsubscribeVerdicts(addresses: string[]): void {
    for (const addr of addresses) {
      this.verdictListeners.delete(addr);
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWsMessage({ action: "unsubscribe", addresses });
    }
  }

  /**
   * Close the WebSocket connection and clean up listeners.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.verdictListeners.clear();
    this.globalListeners = [];
  }

  /**
   * Establish the WebSocket connection if not already open.
   */
  private ensureWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = this.config.baseUrl.replace(/^http/, "ws") + "/v1/feed";
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "verdict" && message.data) {
          const address = message.data.address as string;
          const verdictData = message.data as VerdictResponse;

          // Notify address-specific listeners
          const addrListeners = this.verdictListeners.get(address);
          if (addrListeners) {
            for (const cb of addrListeners) {
              cb(verdictData);
            }
          }

          // Notify global listeners
          for (const cb of this.globalListeners) {
            cb(verdictData);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      // Will attempt reconnect on next subscription
      this.ws = null;
    };

    this.ws.onclose = () => {
      this.ws = null;
    };
  }

  private sendWsMessage(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Fetch with automatic retry on transient failures.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string>),
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs
        );

        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Do not retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Retry on server errors (5xx)
        if (response.status >= 500 && attempt < this.config.retries) {
          await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt));
          continue;
        }

        return response;
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.config.retries) {
          await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error("Request failed after retries");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class WarpApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "WarpApiError";
  }
}
