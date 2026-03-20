const onlineUsers = new Map();
const callSessions = new Map();
const busyUsers = new Set(); // Set of userIds who are currently in a call

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
    busyUsers.delete(userId); // remove from busy when completely offline
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
  
  // Set both users as busy
  if (session.from) busyUsers.add(session.from);
  if (session.to) busyUsers.add(session.to);
}

export function getCallSession(callId) {
  return callSessions.get(callId);
}

export function deleteCallSession(callId) {
  const session = callSessions.get(callId);
  callSessions.delete(callId);

  // Recalculate busy status for both users involved
  if (session) {
    [session.from, session.to].forEach((userId) => {
      if (userId) {
        // Find if this user is in any other active call session
        const hasOtherCalls = Array.from(callSessions.values()).some(
          (s) => s.from === userId || s.to === userId
        );
        if (!hasOtherCalls) {
          busyUsers.delete(userId);
        }
      }
    });
  }
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

export function getBusyUserIds() {
  return new Set(busyUsers);
}