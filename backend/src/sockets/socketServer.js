import { Server } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { isAllowedOrigin } from "../config/cors.js";
import { verifyToken } from "../services/tokenService.js";
import {
  deleteCallSession,
  findUserCallIds,
  getCallSession,
  getOnlineUserIds,
  getUserSocketIds,
  isUserOnline,
  setCallSession,
  setUserOfflineSocket,
  setUserOnline,
} from "./socketState.js";
import { User } from "../models/User.js";

function emitPresence(io) {
  io.emit("presence:update", { onlineUserIds: Array.from(getOnlineUserIds()) });
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

    const user = await User.findById(userId).select("name email");
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);
    setUserOnline(userId, socket.id);
    emitPresence(io);

    socket.emit("presence:bootstrap", { onlineUserIds: Array.from(getOnlineUserIds()) });

    socket.on("call:initiate", ({ to, offer, callType = "video" }, ack) => {
      if (!to || !offer) {
        ack?.({ ok: false, message: "Invalid call payload" });
        return;
      }

      if (!isUserOnline(to)) {
        ack?.({ ok: false, message: "User is offline" });
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

      emitToUser(io, to, "call:incoming", {
        callId,
        from: {
          _id: user._id,
          name: user.name,
          email: user.email,
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
    });

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
      emitPresence(io);
    });
  });

  return io;
}
