import { getRedis, isRedisEnabled } from "../config/redis.js";

const PREFIX = process.env.REDIS_KEY_PREFIX || "callus";

const inMemory = {
  userSockets: new Map(),
  onlineUsers: new Set(),
  busyUsers: new Set(),
  callSessions: new Map(),
  userCalls: new Map(),
};

const k = {
  userSockets: (uid) => `${PREFIX}:user:sockets:${uid}`,
  userCalls: (uid) => `${PREFIX}:user:calls:${uid}`,
  call: (cid) => `${PREFIX}:call:${cid}`,
  busySet: () => `${PREFIX}:user:busy`,
  onlineSet: () => `${PREFIX}:user:online`,
};

function addUserCall(userId, callId) {
  if (!inMemory.userCalls.has(userId)) {
    inMemory.userCalls.set(userId, new Set());
  }
  inMemory.userCalls.get(userId).add(callId);
}

function removeUserCall(userId, callId) {
  const calls = inMemory.userCalls.get(userId);
  if (!calls) {
    return;
  }
  calls.delete(callId);
  if (calls.size === 0) {
    inMemory.userCalls.delete(userId);
  }
}

export async function setUserOnline(userId, socketId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    await Promise.all([
      redis.sAdd(k.userSockets(userId), socketId),
      redis.sAdd(k.onlineSet(), userId),
    ]);
    return;
  }

  if (!inMemory.userSockets.has(userId)) {
    inMemory.userSockets.set(userId, new Set());
  }
  inMemory.userSockets.get(userId).add(socketId);
  inMemory.onlineUsers.add(userId);
}

export async function setUserOfflineSocket(userId, socketId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    await redis.sRem(k.userSockets(userId), socketId);

    const remaining = await redis.sCard(k.userSockets(userId));
    if (remaining === 0) {
      await Promise.all([
        redis.del(k.userSockets(userId)),
        redis.sRem(k.onlineSet(), userId),
        redis.sRem(k.busySet(), userId),
      ]);
    }
    return;
  }

  const sockets = inMemory.userSockets.get(userId);
  if (!sockets) {
    return;
  }
  sockets.delete(socketId);
  if (sockets.size === 0) {
    inMemory.userSockets.delete(userId);
    inMemory.onlineUsers.delete(userId);
    inMemory.busyUsers.delete(userId);
  }
}

export async function isUserOnline(userId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    return redis.sIsMember(k.onlineSet(), userId);
  }

  return inMemory.onlineUsers.has(userId);
}

export async function getUserSocketIds(userId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    return redis.sMembers(k.userSockets(userId));
  }

  return Array.from(inMemory.userSockets.get(userId) || []);
}

export async function getOnlineUserIds() {
  if (isRedisEnabled()) {
    const redis = getRedis();
    return redis.sMembers(k.onlineSet());
  }

  return Array.from(inMemory.onlineUsers);
}

export async function getBusyUserIds() {
  if (isRedisEnabled()) {
    const redis = getRedis();
    return redis.sMembers(k.busySet());
  }

  return Array.from(inMemory.busyUsers);
}

export async function setCallSession(callId, session) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    const ttl = 3600;

    await Promise.all([
      redis.hSet(k.call(callId), {
        id: session.id,
        from: session.from,
        to: session.to,
        status: session.status,
        callType: session.callType,
        createdAt: String(session.createdAt),
      }),
      redis.expire(k.call(callId), ttl),
      redis.sAdd(k.userCalls(session.from), callId),
      redis.expire(k.userCalls(session.from), ttl),
      redis.sAdd(k.userCalls(session.to), callId),
      redis.expire(k.userCalls(session.to), ttl),
      redis.sAdd(k.busySet(), session.from, session.to),
    ]);
    return;
  }

  inMemory.callSessions.set(callId, { ...session });
  addUserCall(session.from, callId);
  addUserCall(session.to, callId);
  inMemory.busyUsers.add(session.from);
  inMemory.busyUsers.add(session.to);
}

export async function getCallSession(callId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    const data = await redis.hGetAll(k.call(callId));
    if (!data || !data.id) {
      return null;
    }
    return { ...data, createdAt: Number(data.createdAt) };
  }

  return inMemory.callSessions.get(callId) || null;
}

export async function deleteCallSession(callId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    const session = await getCallSession(callId);
    if (!session) {
      return;
    }

    await Promise.all([
      redis.del(k.call(callId)),
      redis.sRem(k.userCalls(session.from), callId),
      redis.sRem(k.userCalls(session.to), callId),
    ]);

    for (const userId of [session.from, session.to]) {
      const remainingCalls = await redis.sCard(k.userCalls(userId));
      if (remainingCalls === 0) {
        await redis.sRem(k.busySet(), userId);
      }
    }
    return;
  }

  const session = inMemory.callSessions.get(callId);
  if (!session) {
    return;
  }

  inMemory.callSessions.delete(callId);
  removeUserCall(session.from, callId);
  removeUserCall(session.to, callId);

  if (!inMemory.userCalls.has(session.from)) {
    inMemory.busyUsers.delete(session.from);
  }
  if (!inMemory.userCalls.has(session.to)) {
    inMemory.busyUsers.delete(session.to);
  }
}

export async function findUserCallIds(userId) {
  if (isRedisEnabled()) {
    const redis = getRedis();
    return redis.sMembers(k.userCalls(userId));
  }

  return Array.from(inMemory.userCalls.get(userId) || []);
}
