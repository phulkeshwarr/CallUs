/**
 * sockets/socketServer.js  —  Redis-backed, multi-instance ready
 *
 * Changes from the original:
 *  1. Uses @socket.io/redis-adapter so all server instances share one
 *     Socket.IO message bus — essential for horizontal scaling.
 *  2. All socketState calls are now async (Redis I/O).
 *  3. emitPresence is debounced (500ms) — prevents O(n²) broadcast storms.
 *  4. User document is fetched once in the auth middleware and cached on
 *     the socket object — no DB hit on every connection.
 */

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { v4 as uuidv4 } from "uuid";
import { isAllowedOrigin } from "../config/cors.js";
import { verifyToken } from "../services/tokenService.js";
import { getRedisPubSub, isRedisEnabled } from "../config/redis.js";
import { User } from "../models/User.js";
import {
  deleteCallSession,
  findUserCallIds,
  getCallSession,
  getOnlineUserIds,
  getBusyUserIds,
  getUserSocketIds,
  isUserOnline,
  setCallSession,
  setUserOfflineSocket,
  setUserOnline,
} from "./socketState.js";

// ─── Debounced presence broadcast ────────────────────────────────────────────
// Without debouncing, every connect/disconnect/call-event triggers a full
// broadcast to ALL connected clients.  With 500ms debounce the server emits
// at most 2 presence updates per second regardless of event rate.

let presenceTimer = null;

function emitPresence(io) {
  if (presenceTimer) return;
  presenceTimer = setTimeout(async () => {
    presenceTimer = null;
    const [onlineUserIds, busyUserIds] = await Promise.all([
      getOnlineUserIds(),
      getBusyUserIds(),
    ]);
    io.emit("presence:update", { onlineUserIds, busyUserIds });
  }, 500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function emitToUser(io, userId, event, payload) {
  const socketIds = await getUserSocketIds(userId);
  socketIds.forEach((socketId) => io.to(socketId).emit(event, payload));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  if (isRedisEnabled()) {
    const [pubClient, subClient] = getRedisPubSub();
    io.adapter(createAdapter(pubClient, subClient));
  } else {
    console.warn("Socket.IO Redis adapter disabled. Using single-instance mode.");
  }

  // ── Auth middleware ────────────────────────────────────────────────────────
  // Fetch & cache the User document here — once per connection — so
  // individual event handlers never need their own DB queries.

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = verifyToken(token);
      socket.userId = decoded.userId;

      const user = await User.findById(decoded.userId)
        .select("name email country userId")
        .lean();

      if (!user) return next(new Error("User not found"));
      socket.user = user; // cached for the lifetime of this socket

      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  // ── Connection ─────────────────────────────────────────────────────────────

  io.on("connection", async (socket) => {
    const { userId, user } = socket;

    socket.join(`user:${userId}`);
    await setUserOnline(userId, socket.id);
    emitPresence(io);

    const [onlineUserIds, busyUserIds] = await Promise.all([
      getOnlineUserIds(),
      getBusyUserIds(),
    ]);
    socket.emit("presence:bootstrap", { onlineUserIds, busyUserIds });

    // ── Call events ───────────────────────────────────────────────────────

    socket.on("call:initiate", async ({ to, offer, callType = "video" }, ack) => {
      if (!to || !offer) {
        ack?.({ ok: false, message: "Invalid call payload" });
        return;
      }

      const [online, busyIds] = await Promise.all([
        isUserOnline(to),
        getBusyUserIds(),
      ]);

      if (!online) {
        ack?.({ ok: false, message: "User is offline" });
        return;
      }
      if (busyIds.includes(to)) {
        ack?.({ ok: false, message: "User is busy in another call" });
        return;
      }

      const callId = uuidv4();
      await setCallSession(callId, {
        id: callId,
        from: userId,
        to,
        status: "ringing",
        callType,
        createdAt: Date.now(),
      });
      emitPresence(io);

      await emitToUser(io, to, "call:incoming", {
        callId,
        from: {
          _id: user._id,
          name: user.name,
          country: user.country,
          userId: user.userId,
        },
        offer,
        callType,
      });

      ack?.({ ok: true, callId });
    });

    socket.on("call:accept", async ({ callId, answer }) => {
      const session = await getCallSession(callId);
      if (!session || session.to !== userId) return;

      await setCallSession(callId, { ...session, status: "active" });
      await emitToUser(io, session.from, "call:accepted", { callId, answer });
    });

    socket.on("call:reject", async ({ callId, reason = "Call rejected" }) => {
      const session = await getCallSession(callId);
      if (!session || session.to !== userId) return;

      await emitToUser(io, session.from, "call:rejected", { callId, reason });
      await deleteCallSession(callId);
      emitPresence(io);
    });

    socket.on("call:ice-candidate", async ({ callId, candidate }) => {
      const session = await getCallSession(callId);
      if (!session || !candidate) return;

      const targetUserId = session.from === userId ? session.to : session.from;
      await emitToUser(io, targetUserId, "call:ice-candidate", { callId, candidate });
    });

    socket.on("call:end", async ({ callId }) => {
      const session = await getCallSession(callId);
      if (!session) return;
      if (session.from !== userId && session.to !== userId) return;

      const targetUserId = session.from === userId ? session.to : session.from;
      await emitToUser(io, targetUserId, "call:ended", { callId });
      await deleteCallSession(callId);
      emitPresence(io);
    });

    // ── Chat events ───────────────────────────────────────────────────────

    socket.on("chat:send", async ({ to, text }) => {
      if (!to || !text || typeof text !== "string") return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const message = {
        id: uuidv4(),
        from: {
          _id: user._id.toString(),
          name: user.name,
          country: user.country,
          userId: user.userId,
        },
        text: trimmed,
        timestamp: Date.now(),
      };

      await emitToUser(io, to, "chat:receive", message);
      socket.emit("chat:receive", { ...message, isSelf: true });
    });

    socket.on("chat:typing", async ({ to, isTyping }) => {
      if (!to) return;
      await emitToUser(io, to, "chat:typing", {
        from: user._id.toString(),
        fromUserId: user.userId,
        isTyping: !!isTyping,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      const callIds = await findUserCallIds(userId);

      await Promise.all(
        callIds.map(async (callId) => {
          const session = await getCallSession(callId);
          if (!session) return;
          const targetUserId = session.from === userId ? session.to : session.from;
          await emitToUser(io, targetUserId, "call:ended", {
            callId,
            reason: "User disconnected",
          });
          await deleteCallSession(callId);
        })
      );

      await setUserOfflineSocket(userId, socket.id);
      emitPresence(io);
    });
  });

  return io;
}
