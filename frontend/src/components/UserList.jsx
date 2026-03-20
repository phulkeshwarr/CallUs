import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../context/CallContext";
import { useChat } from "../context/ChatContext";
import { useAuth } from "../context/AuthContext";
import { getCountryFlag } from "../data/countries";

export function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { onlineUserIds, busyUserIds, isSocketConnected } = useSocket();
  const { callState, startCall } = useCall();
  const { openChat, getUnread } = useChat();
  const { token, user: currentUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setUsers([]);
      setLoading(false);
      return;
    }

    async function fetchUsers() {
      setLoading(true);
      try {
        const { data } = await api.get("/users");
        setUsers((data.users || []).filter((item) => item._id !== currentUser?._id));
      } catch (error) {
        setUsers([]);
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [token, currentUser?._id]);

  const normalizedUsers = users.map((user) => {
    const isOnline = onlineUserIds.includes(user._id);
    const isBusy = busyUserIds.includes(user._id);
    const isAvailable = isOnline && !isBusy;
    
    return {
      ...user,
      isOnline,
      isBusy,
      isAvailable,
    };
  });

  // Sort: Available first, then Busy, then Offline
  const sortedUsers = [...normalizedUsers].sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    
    if (a.isBusy && !b.isBusy) return -1;
    if (!a.isBusy && b.isBusy) return 1;
    
    return 0;
  });

  function handleChat(user) {
    openChat({
      _id: user._id,
      name: user.name,
      country: user.country,
      userId: user.userId,
      flag: getCountryFlag(user.country),
    });
  }

  function getStatusDotColor(user) {
    if (user.isAvailable) return "var(--success)";
    if (user.isBusy) return "var(--warning)";
    return "var(--text-muted)";
  }

  function getStatusLabel(user) {
    if (user.isAvailable) return "🟢 Available";
    if (user.isBusy) return "🟡 Busy";
    return "⚪ Offline";
  }

  return (
    <section className="user-list">
      {!isSocketConnected && (
        <p style={{ padding: "0.5rem", color: "var(--warning)", fontSize: "0.8rem", textAlign: "center" }}>
          ⚠ Reconnecting...
        </p>
      )}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <div className="loading-spinner" />
        </div>
      )}
      {!loading && sortedUsers.length === 0 && (
        <div className="no-chat">
          <span style={{ fontSize: "2rem", opacity: 0.3 }}>👥</span>
          <p style={{ fontSize: "0.85rem" }}>No other users yet</p>
        </div>
      )}

      {sortedUsers.map((user) => {
        const flag = getCountryFlag(user.country);
        const unread = getUnread(user._id);
        const dotColor = getStatusDotColor(user);
        const canCall = user.isAvailable && callState === "idle" && isSocketConnected;

        return (
          <article className="user-card" key={user._id}>
            <div className="user-avatar">
              {flag}
              <span 
                className="status-dot" 
                style={{ 
                  background: dotColor,
                  boxShadow: user.isAvailable ? `0 0 8px var(--success-glow)` : user.isBusy ? `0 0 8px rgba(245, 158, 11, 0.3)` : 'none',
                  animation: user.isAvailable || user.isBusy ? 'pulse 2s infinite' : 'none'
                }} 
              />
            </div>

            <div className="user-info">
              <h4>
                {user.name}
              </h4>
              <div className="user-meta">
                <span className="uid" style={{ marginRight: 6 }}>#{user.userId}</span>
                <span className="country-name" style={{ fontSize: "0.7rem", color: dotColor }}>
                  {getStatusLabel(user)}
                </span>
              </div>
            </div>

            <div className="user-actions">
              <button
                className="btn btn-sm"
                onClick={() => handleChat(user)}
                type="button"
                title="Chat"
                style={{ position: "relative" }}
              >
                💬
                {unread > 0 && (
                  <span style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "var(--danger)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 16,
                    height: 16,
                    fontSize: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}>
                    {unread}
                  </span>
                )}
              </button>
              <button
                className="btn btn-sm"
                disabled={!canCall}
                onClick={() => startCall(user, "audio")}
                type="button"
                title="Audio call"
                style={{ opacity: canCall ? 1 : 0.3 }}
              >
                🎤
              </button>
              <button
                className="btn btn-sm"
                disabled={!canCall}
                onClick={() => startCall(user, "video")}
                type="button"
                title="Video call"
                style={{ opacity: canCall ? 1 : 0.3 }}
              >
                📹
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
