import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { setupSocket } from "./sockets/socketServer.js";

async function start() {
  await connectDB();

  const server = http.createServer(app);
  setupSocket(server);

  server.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});