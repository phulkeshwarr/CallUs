/**
 * config/redis.js
 *
 * Creates two Redis clients:
 *   - pubClient  →  used by Socket.IO Redis adapter (publishes)
 *   - subClient  →  used by Socket.IO Redis adapter (subscribes)
 *   - dataClient →  used by socketState.js for data operations
 *
 * Socket.IO requires separate pub/sub clients because a client in
 * subscribe mode cannot issue regular commands.
 */

import { createClient } from "redis";

let pubClient  = null;
let subClient  = null;
let dataClient = null;

export async function connectRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error("REDIS_URL is not set in environment variables");
  }

  pubClient  = createClient({ url });
  subClient  = pubClient.duplicate();
  dataClient = pubClient.duplicate();

  pubClient.on("error",  (err) => console.error("[Redis pub]",  err));
  subClient.on("error",  (err) => console.error("[Redis sub]",  err));
  dataClient.on("error", (err) => console.error("[Redis data]", err));

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
    dataClient.connect(),
  ]);

  console.log("✅ Redis connected");
}

/** Returns the data client (for socketState operations). */
export function getRedis() {
  if (!dataClient) throw new Error("Redis not initialised — call connectRedis() first");
  return dataClient;
}

/** Returns [pubClient, subClient] for the Socket.IO adapter. */
export function getRedisPubSub() {
  if (!pubClient || !subClient) {
    throw new Error("Redis not initialised — call connectRedis() first");
  }
  return [pubClient, subClient];
}
