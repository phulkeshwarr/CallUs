import { createClient } from "redis";

let pubClient = null;
let subClient = null;
let dataClient = null;
let redisEnabled = false;

export async function connectRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("REDIS_URL is not set. Falling back to in-memory realtime state.");
    redisEnabled = false;
    return false;
  }

  pubClient = createClient({ url });
  subClient = pubClient.duplicate();
  dataClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("[Redis pub]", err));
  subClient.on("error", (err) => console.error("[Redis sub]", err));
  dataClient.on("error", (err) => console.error("[Redis data]", err));

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
    dataClient.connect(),
  ]);

  redisEnabled = true;
  console.log("Redis connected");
  return true;
}

export function isRedisEnabled() {
  return redisEnabled && Boolean(pubClient) && Boolean(subClient) && Boolean(dataClient);
}

export function getRedis() {
  if (!dataClient) {
    throw new Error("Redis not initialised. Call connectRedis() first.");
  }
  return dataClient;
}

export function getRedisPubSub() {
  if (!pubClient || !subClient) {
    throw new Error("Redis not initialised. Call connectRedis() first.");
  }
  return [pubClient, subClient];
}
