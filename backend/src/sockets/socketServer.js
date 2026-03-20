import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { isAllowedOrigin } from "../config/cors.js";
import { verifyToken } from "../services/tokenService.js";
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
import { User } from "../models/User.js";

function emitPresence(io) {
  io.emit("presence:update", {
    onlineUserIds: Array.from(getOnlineUserIds()),
    busyUserIds: Array.from(getBusyUserIds()),
  });
}

function emitToUser(io, userId, event, payload) {
  const socketIds = getUserSocketIds(userId);
  socketIds.forEach((socketId) => io.to(socketId).emit(event, payload));
}

export function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;

    const user = await User.findById(userId).select("name email country userId");
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);
    setUserOnline(userId, socket.id);
    emitPresence(io);

    socket.emit("presence:bootstrap", {
      onlineUserIds: Array.from(getOnlineUserIds()),
      busyUserIds: Array.from(getBusyUserIds()),
    });

    // ── Call events ──────────────────────────────────────────────

    socket.on("call:initiate", ({ to, offer, callType = "video" }, ack) => {
      if (!to || !offer) {
        ack?.({ ok: false, message: "Invalid call payload" });
        return;
      }

      if (!isUserOnline(to)) {
        ack?.({ ok: false, message: "User is offline" });
        return;
      }

      const busySet = getBusyUserIds();
      if (busySet.has(to)) {
        ack?.({ ok: false, message: "User is busy in another call" });
        return;
      }

      const callId = uuidv4();
      setCallSession(callId, {
        id: callId,
        from: userId,
        to,
        status: "ringing",
        callType,
        createdAt: Date.now(),
      });
      emitPresence(io); // Update busy status

      emitToUser(io, to, "call:incoming", {
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

    socket.on("call:accept", ({ callId, answer }) => {
      const session = getCallSession(callId);
      if (!session || session.to !== userId) {
        return;
      }

      session.status = "active";
      setCallSession(callId, session);

      emitToUser(io, session.from, "call:accepted", { callId, answer });
    });

    socket.on("call:reject", ({ callId, reason = "Call rejected" }) => {
      const session = getCallSession(callId);
      if (!session || session.to !== userId) {
        return;
      }

      emitToUser(io, session.from, "call:rejected", { callId, reason });
      deleteCallSession(callId);
      emitPresence(io); // Update busy status
    });

    socket.on("call:ice-candidate", ({ callId, candidate }) => {
      const session = getCallSession(callId);
      if (!session || !candidate) {
        return;
      }

      const targetUserId = session.from === userId ? session.to : session.from;
      emitToUser(io, targetUserId, "call:ice-candidate", { callId, candidate });
    });

    socket.on("call:end", ({ callId }) => {
      const session = getCallSession(callId);
      if (!session) {
        return;
      }

      if (session.from !== userId && session.to !== userId) {
        return;
      }

      const targetUserId = session.from === userId ? session.to : session.from;
      emitToUser(io, targetUserId, "call:ended", { callId });
      deleteCallSession(callId);
      emitPresence(io); // Update busy status
    });

    // ── Chat events ──────────────────────────────────────────────

    socket.on("chat:send", ({ to, text }) => {
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

      // Send to recipient
      emitToUser(io, to, "chat:receive", message);
      // Echo back to sender for confirmation
      socket.emit("chat:receive", { ...message, isSelf: true });
    });

    socket.on("chat:typing", ({ to, isTyping }) => {
      if (!to) return;
      emitToUser(io, to, "chat:typing", {
        from: user._id.toString(),
        fromUserId: user.userId,
        isTyping: !!isTyping,
      });
    });

    // ── Disconnect ───────────────────────────────────────────────

    socket.on("disconnect", () => {
      const userCallIds = findUserCallIds(userId);
      userCallIds.forEach((callId) => {
        const session = getCallSession(callId);
        if (!session) {
          return;
        }
        const targetUserId = session.from === userId ? session.to : session.from;
        emitToUser(io, targetUserId, "call:ended", { callId, reason: "User disconnected" });
        deleteCallSession(callId);
      });

      setUserOfflineSocket(userId, socket.id);
      emitPresence(io); // Updates both online and busy
    });
  });

  return io;
}
