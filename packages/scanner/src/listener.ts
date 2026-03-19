import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
  type Logs,
} from "@solana/web3.js";
import EventEmitter from "eventemitter3";
import pino from "pino";
import type {
  ListenerConfig,
  SolanaTransactionMeta,
  ScannerEvents,
} from "./types";

const DEFAULT_CONFIG: ListenerConfig = {
  rpcUrl: "https://api.mainnet-beta.solana.com",
  wsUrl: "wss://api.mainnet-beta.solana.com",
  commitment: "confirmed",
  maxReconnectAttempts: 10,
  reconnectDelayMs: 2000,
  batchSize: 50,
  programIds: [],
};

/**
 * SolanaListener maintains a WebSocket connection to a Solana RPC node
 * and streams transaction data for monitored program IDs. It handles
 * reconnection logic, transaction parsing, and emits structured events
 * for downstream consumption by signal extractors.
 */
export class SolanaListener extends EventEmitter<ScannerEvents> {
  private readonly config: ListenerConfig;
  private readonly logger: pino.Logger;
  private connection: Connection;
  private subscriptionIds: number[] = [];
  private reconnectAttempts = 0;
  private isRunning = false;
  private transactionBuffer: Map<string, SolanaTransactionMeta> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<ListenerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = pino({ name: "warp-scanner-listener" });
    this.connection = new Connection(this.config.rpcUrl, {
      wsEndpoint: this.config.wsUrl,
      commitment: this.config.commitment,
    });
  }

  /**
   * Start listening for transactions on all configured program IDs.
   * Sets up WebSocket subscriptions and begins buffering transactions.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Listener is already running, ignoring start call");
      return;
    }

    this.isRunning = true;
    this.reconnectAttempts = 0;
    this.logger.info(
      { programIds: this.config.programIds },
      "Starting Solana listener"
    );

    for (const programId of this.config.programIds) {
      await this.subscribeToProgramLogs(programId);
    }

    this.flushTimer = setInterval(() => {
      this.flushTransactionBuffer();
    }, 1000);

    this.emit("connected");
  }

  /**
   * Stop all WebSocket subscriptions and clean up resources.
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info("Stopping Solana listener");

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    for (const subId of this.subscriptionIds) {
      try {
        await this.connection.removeOnLogsListener(subId);
      } catch (err) {
        this.logger.error({ subId, err }, "Failed to remove log listener");
      }
    }

    this.subscriptionIds = [];
    this.flushTransactionBuffer();
    this.emit("disconnected");
  }

  /**
   * Fetch historical transactions for a given address within a slot range.
   * Used for backfilling signal data when an agent is first observed.
   */
  async fetchHistoricalTransactions(
    address: string,
    limit: number = 100
  ): Promise<SolanaTransactionMeta[]> {
    const pubkey = new PublicKey(address);
    const signatures = await this.connection.getSignaturesForAddress(pubkey, {
      limit,
    });

    const transactions: SolanaTransactionMeta[] = [];

    const chunks = this.chunkArray(signatures, this.config.batchSize);
    for (const chunk of chunks) {
      const sigs = chunk.map((s) => s.signature);
      const parsed = await this.connection.getParsedTransactions(sigs, {
        maxSupportedTransactionVersion: 0,
      });

      for (let i = 0; i < parsed.length; i++) {
        const tx = parsed[i];
        if (tx && tx.meta) {
          transactions.push(this.parseSolanaTransaction(tx, sigs[i]));
        }
      }
    }

    this.logger.info(
      { address, count: transactions.length },
      "Fetched historical transactions"
    );

    return transactions;
  }

  /**
   * Subscribe to on-chain logs for a specific program ID.
   * When logs appear, the corresponding transaction is fetched and buffered.
   */
  private async subscribeToProgramLogs(programId: string): Promise<void> {
    const pubkey = new PublicKey(programId);

    const subId = this.connection.onLogs(
      pubkey,
      async (logs: Logs) => {
        if (logs.err) {
          return;
        }

        try {
          await this.handleLogNotification(logs.signature);
        } catch (err) {
          this.logger.error(
            { signature: logs.signature, err },
            "Error processing log notification"
          );
        }
      },
      this.config.commitment
    );

    this.subscriptionIds.push(subId);
    this.logger.info({ programId, subId }, "Subscribed to program logs");
  }

  /**
   * Handle a log notification by fetching the full transaction
   * and adding it to the buffer for batch processing.
   */
  private async handleLogNotification(signature: string): Promise<void> {
    if (this.transactionBuffer.has(signature)) {
      return;
    }

    const tx = await this.connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      return;
    }

    const parsed = this.parseSolanaTransaction(tx, signature);
    this.transactionBuffer.set(signature, parsed);

    if (this.transactionBuffer.size >= this.config.batchSize) {
      this.flushTransactionBuffer();
    }
  }

  /**
   * Convert a parsed Solana transaction into our internal representation.
   */
  private parseSolanaTransaction(
    tx: ParsedTransactionWithMeta,
    signature: string
  ): SolanaTransactionMeta {
    const meta = tx.meta!;

    const innerInstructions = (meta.innerInstructions || []).map((inner) => ({
      index: inner.index,
      instructions: inner.instructions.map((ix) => {
        if ("parsed" in ix) {
          return {
            programIdIndex: 0,
            accounts: [],
            data: JSON.stringify(ix.parsed),
          };
        }
        return {
          programIdIndex: ix.programIdIndex,
          accounts: ix.accounts,
          data: ix.data,
        };
      }),
    }));

    return {
      signature,
      slot: tx.slot,
      blockTime: tx.blockTime,
      err: meta.err,
      fee: meta.fee,
      preBalances: meta.preBalances,
      postBalances: meta.postBalances,
      logMessages: meta.logMessages || [],
      innerInstructions,
    };
  }

  /**
   * Flush all buffered transactions by emitting them as signals.
   * Groups transactions by the first account key (assumed to be the signer).
   */
  private flushTransactionBuffer(): void {
    if (this.transactionBuffer.size === 0) {
      return;
    }

    const buffered = Array.from(this.transactionBuffer.values());
    this.transactionBuffer.clear();

    this.logger.debug(
      { count: buffered.length },
      "Flushing transaction buffer"
    );

    for (const tx of buffered) {
      this.emit("signal", {
        address: tx.signature,
        category: "timing",
        name: "tx_observed",
        value: 1,
        slot: tx.slot,
        timestamp: tx.blockTime || Date.now() / 1000,
        metadata: { fee: tx.fee, logCount: tx.logMessages.length },
      });
    }
  }

  /**
   * Attempt to reconnect after a WebSocket disconnection.
   * Uses exponential backoff with a configurable maximum.
   */
  async reconnect(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.reconnectAttempts++;

    if (this.reconnectAttempts > this.config.maxReconnectAttempts) {
      const err = new Error(
        `Max reconnect attempts (${this.config.maxReconnectAttempts}) exceeded`
      );
      this.emit("error", err);
      this.isRunning = false;
      return;
    }

    const delay =
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);
    this.logger.info(
      { attempt: this.reconnectAttempts, delayMs: delay },
      "Attempting reconnection"
    );

    this.emit("reconnecting", this.reconnectAttempts);

    await this.sleep(delay);

    this.connection = new Connection(this.config.rpcUrl, {
      wsEndpoint: this.config.wsUrl,
      commitment: this.config.commitment,
    });

    this.subscriptionIds = [];

    for (const programId of this.config.programIds) {
      await this.subscribeToProgramLogs(programId);
    }

    this.reconnectAttempts = 0;
    this.emit("connected");
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
