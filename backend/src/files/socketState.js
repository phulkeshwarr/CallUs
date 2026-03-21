/**
 * socketState.js  —  Redis-backed replacement for the in-memory Map/Set version.
 *
 * Key schema
 * ──────────
 *  user:sockets:{userId}   →  Redis Set   of socketIds
 *  user:busy               →  Redis Set   of userIds currently in a call
 *  call:{callId}           →  Redis Hash  of call session fields
 *  user:calls:{userId}     →  Redis Set   of callIds the user is involved in
 *
 * All keys use a configurable prefix (default "callus") so multiple
 * environments can share the same Redis instance.
 */

import { getRedis } from "../config/redis.js";

const PREFIX = process.env.REDIS_KEY_PREFIX || "callus";

const k = {
  userSockets: (uid)  => `${PREFIX}:user:sockets:${uid}`,
  userCalls:   (uid)  => `${PREFIX}:user:calls:${uid}`,
  call:        (cid)  => `${PREFIX}:call:${cid}`,
  busySet:     ()     => `${PREFIX}:user:busy`,
  onlineSet:   ()     => `${PREFIX}:user:online`,   // auxiliary sorted set for quick list
};

// ─── Online / Offline ────────────────────────────────────────────────────────

export async function setUserOnline(userId, socketId) {
  const redis = getRedis();
  await Promise.all([
    redis.sadd(k.userSockets(userId), socketId),
    redis.sadd(k.onlineSet(), userId),          // track in a global set too
  ]);
}

export async function setUserOfflineSocket(userId, socketId) {
  const redis = getRedis();
  await redis.srem(k.userSockets(userId), socketId);

  const remaining = await redis.scard(k.userSockets(userId));
  if (remaining === 0) {
    await Promise.all([
      redis.del(k.userSockets(userId)),
      redis.srem(k.onlineSet(), userId),
      redis.srem(k.busySet(), userId),
    ]);
  }
}

export async function isUserOnline(userId) {
  const redis = getRedis();
  return (await redis.sismember(k.onlineSet(), userId)) === 1;
}

export async function getUserSocketIds(userId) {
  const redis = getRedis();
  return redis.smembers(k.userSockets(userId));   // returns [] if key missing
}

export async function getOnlineUserIds() {
  const redis = getRedis();
  return redis.smembers(k.onlineSet());
}

// ─── Busy users ──────────────────────────────────────────────────────────────

export async function getBusyUserIds() {
  const redis = getRedis();
  return redis.smembers(k.busySet());
}

// ─── Call sessions ───────────────────────────────────────────────────────────

/**
 * session shape: { id, from, to, status, callType, createdAt }
 */
export async function setCallSession(callId, session) {
  const redis = getRedis();
  const ttl = 3600; // auto-expire stale sessions after 1 hour

  await Promise.all([
    // Store all fields as a Redis hash
    redis.hset(k.call(callId), {
      id:        session.id,
      from:      session.from,
      to:        session.to,
      status:    session.status,
      callType:  session.callType,
      createdAt: String(session.createdAt),
    }),
    redis.expire(k.call(callId), ttl),

    // Index: user → callIds
    redis.sadd(k.userCalls(session.from), callId),
    redis.expire(k.userCalls(session.from), ttl),
    redis.sadd(k.userCalls(session.to), callId),
    redis.expire(k.userCalls(session.to), ttl),

    // Mark both users busy
    redis.sadd(k.busySet(), session.from, session.to),
  ]);
}

export async function getCallSession(callId) {
  const redis = getRedis();
  const data = await redis.hgetall(k.call(callId));
  if (!data || !data.id) return null;
  return { ...data, createdAt: Number(data.createdAt) };
}

export async function deleteCallSession(callId) {
  const redis = getRedis();
  const session = await getCallSession(callId);
  if (!session) return;

  await Promise.all([
    redis.del(k.call(callId)),
    redis.srem(k.userCalls(session.from), callId),
    redis.srem(k.userCalls(session.to), callId),
  ]);

  // Only un-busy a user if they have no other active calls
  for (const userId of [session.from, session.to]) {
    const remainingCalls = await redis.scard(k.userCalls(userId));
    if (remainingCalls === 0) {
      await redis.srem(k.busySet(), userId);
    }
  }
}

export async function findUserCallIds(userId) {
  const redis = getRedis();
  return redis.smembers(k.userCalls(userId));
}
