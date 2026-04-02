import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import pino from "pino";
import { verdictRoutes } from "./routes/verdict";
import { queryRoutes } from "./routes/query";
import { feedRoutes } from "./routes/feed";

const logger = pino({ name: "warp-api" });

const HOST = process.env.WARP_API_HOST || "0.0.0.0";
const PORT = parseInt(process.env.WARP_API_PORT || "3100", 10);

async function main(): Promise<void> {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  await app.register(websocket);

  // Health check
  app.get("/health", async () => {
    return { status: "ok", version: "0.4.0", timestamp: Date.now() };
  });

  // Register route modules
  await app.register(verdictRoutes, { prefix: "/v1" });
  await app.register(queryRoutes, { prefix: "/v1" });
  await app.register(feedRoutes, { prefix: "/v1" });

  try {
    await app.listen({ host: HOST, port: PORT });
    logger.info({ host: HOST, port: PORT }, "Warp Protocol API server started");
  } catch (err) {
    logger.error(err, "Failed to start API server");
    process.exit(1);
  }
}

main();
