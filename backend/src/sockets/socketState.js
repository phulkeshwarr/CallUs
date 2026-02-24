const onlineUsers = new Map();
const callSessions = new Map();

export function setUserOnline(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socketId);
}

export function setUserOfflineSocket(userId, socketId) {
  if (!onlineUsers.has(userId)) {
    return;
  }

  const sockets = onlineUsers.get(userId);
  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
}

export function getOnlineUserIds() {
  return new Set(onlineUsers.keys());
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId);
}

export function getUserSocketIds(userId) {
  return Array.from(onlineUsers.get(userId) || []);
}

export function setCallSession(callId, session) {
  callSessions.set(callId, session);
}

export function getCallSession(callId) {
  return callSessions.get(callId);
}

export function deleteCallSession(callId) {
  callSessions.delete(callId);
}

export function findUserCallIds(userId) {
  const callIds = [];
  for (const [callId, session] of callSessions.entries()) {
    if (session.from === userId || session.to === userId) {
      callIds.push(callId);
    }
  }
  return callIds;
}