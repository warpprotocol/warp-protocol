import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import pino from "pino";
import { VerdictEngine } from "@warp-protocol/verdict-engine";

const logger = pino({ name: "warp-api-feed" });

interface FeedSubscription {
  ws: WebSocket;
  addresses: Set<string>;
  subscribedAll: boolean;
}

const subscriptions = new Map<string, FeedSubscription>();
const verdictEngine = new VerdictEngine();

/**
 * WebSocket /v1/feed
 *
 * Real-time verdict feed. Clients connect via WebSocket and subscribe
 * to verdict updates for specific addresses or all addresses.
 *
 * Client messages:
 *   { "action": "subscribe", "addresses": ["addr1", "addr2"] }
 *   { "action": "subscribe_all" }
 *   { "action": "unsubscribe", "addresses": ["addr1"] }
 *   { "action": "ping" }
 *
 * Server messages:
 *   { "type": "verdict", "data": { ... } }
 *   { "type": "subscribed", "addresses": [...] }
 *   { "type": "pong" }
 *   { "type": "error", "message": "..." }
 */
export async function feedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/feed", { websocket: true }, (connection) => {
    const ws = connection.socket;
    const clientId = generateClientId();

    const subscription: FeedSubscription = {
      ws,
      addresses: new Set(),
      subscribedAll: false,
    };

    subscriptions.set(clientId, subscription);
    logger.info({ clientId }, "WebSocket client connected to feed");

    // Register verdict change listener for this client
    verdictEngine.onVerdictChange((address, oldVerdict, newVerdict) => {
      if (
        subscription.subscribedAll ||
        subscription.addresses.has(address)
      ) {
        const cached = verdictEngine.getCachedVerdict(address);
        sendMessage(ws, {
          type: "verdict",
          data: {
            address,
            previousVerdict: oldVerdict,
            currentVerdict: newVerdict,
            confidence: cached?.confidence ?? 0,
            timestamp: Date.now(),
          },
        });
      }
    });

    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        handleClientMessage(clientId, subscription, message);
      } catch {
        sendMessage(ws, {
          type: "error",
          message: "Invalid JSON message",
        });
      }
    });

    ws.on("close", () => {
      subscriptions.delete(clientId);
      logger.info({ clientId }, "WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ clientId, err }, "WebSocket error");
      subscriptions.delete(clientId);
    });
  });
}

function handleClientMessage(
  clientId: string,
  subscription: FeedSubscription,
  message: Record<string, unknown>
): void {
  const { ws } = subscription;
  const action = message.action as string;

  switch (action) {
    case "subscribe": {
      const addresses = message.addresses as string[] | undefined;
      if (!Array.isArray(addresses) || addresses.length === 0) {
        sendMessage(ws, {
          type: "error",
          message: "subscribe requires a non-empty addresses array",
        });
        return;
      }

      for (const addr of addresses) {
        subscription.addresses.add(addr);
      }

      logger.info(
        { clientId, newAddresses: addresses.length, total: subscription.addresses.size },
        "Client subscribed to addresses"
      );

      sendMessage(ws, {
        type: "subscribed",
        addresses: Array.from(subscription.addresses),
      });
      break;
    }

    case "subscribe_all": {
      subscription.subscribedAll = true;
      logger.info({ clientId }, "Client subscribed to all verdicts");
      sendMessage(ws, { type: "subscribed_all" });
      break;
    }

    case "unsubscribe": {
      const addresses = message.addresses as string[] | undefined;
      if (Array.isArray(addresses)) {
        for (const addr of addresses) {
          subscription.addresses.delete(addr);
        }
      }
      sendMessage(ws, {
        type: "unsubscribed",
        addresses: Array.from(subscription.addresses),
      });
      break;
    }

    case "ping": {
      sendMessage(ws, { type: "pong", timestamp: Date.now() });
      break;
    }

    default: {
      sendMessage(ws, {
        type: "error",
        message: `Unknown action: ${action}`,
      });
    }
  }
}

function sendMessage(ws: WebSocket, data: unknown): void {
  try {
    ws.send(JSON.stringify(data));
  } catch (err) {
    logger.error({ err }, "Failed to send WebSocket message");
  }
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
