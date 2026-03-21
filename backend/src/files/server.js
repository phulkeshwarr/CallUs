import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { connectRedis } from "./config/redis.js";   // ← new
import { setupSocket } from "./sockets/socketServer.js";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

async function start() {
  await connectDB();
  await connectRedis();   // ← connect Redis before starting the socket server

  const server = http.createServer(app);
  setupSocket(server);

  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error?.message || error);
  process.exit(1);
});
