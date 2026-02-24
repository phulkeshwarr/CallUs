import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { useCall } from "../context/CallContext";
import { useAuth } from "../context/AuthContext";

export function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { onlineUserIds, isSocketConnected } = useSocket();
  const { callState, startCall } = useCall();
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

  const normalizedUsers = users.map((user) => ({
    ...user,
    isOnline: onlineUserIds.includes(user._id),
  }));

  return (
    <section className="user-list">
      <h3>Users</h3>
      {!isSocketConnected && <p>Realtime connection unavailable. Reconnecting...</p>}
      {loading && <p>Loading users...</p>}
      {!loading && normalizedUsers.length === 0 && <p>No users found.</p>}

      {normalizedUsers.map((user) => (
        <article className="user-card" key={user._id}>
          <div>
            <h4>{user.name}</h4>
            <p>{user.email}</p>
            <small className={user.isOnline ? "online" : "offline"}>
              {user.isOnline ? "Online" : "Offline"}
            </small>
          </div>

          <div className="user-actions">
            <button
              className="btn"
              disabled={!isSocketConnected || !user.isOnline || callState !== "idle"}
              onClick={() => startCall(user, "audio")}
              type="button"
            >
              Audio
            </button>
            <button
              className="btn"
              disabled={!isSocketConnected || !user.isOnline || callState !== "idle"}
              onClick={() => startCall(user, "video")}
              type="button"
            >
              Video
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
