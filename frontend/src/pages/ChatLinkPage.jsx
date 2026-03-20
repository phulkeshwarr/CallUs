import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { getCountryFlag } from "../data/countries";

export function ChatLinkPage() {
  const { userId: targetUserId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { openChat } = useChat();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function lookup() {
      setLoading(true);
      try {
        const { data } = await api.get(`/users/lookup/${targetUserId}`);
        setTargetUser(data.user);
      } catch (err) {
        setError(err.response?.data?.message || "User not found");
      } finally {
        setLoading(false);
      }
    }

    if (targetUserId) {
      lookup();
    }
  }, [targetUserId]);

  function handleStartChat() {
    if (!targetUser) return;
    openChat({
      _id: targetUser._id,
      name: targetUser.name,
      country: targetUser.country,
      userId: targetUser.userId,
      flag: getCountryFlag(targetUser.country),
    });
    navigate("/");
  }

  if (authLoading || loading) {
    return (
      <div className="screen-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="chat-link-page">
        <div className="chat-link-card">
          <h2>User Not Found</h2>
          <p style={{ color: "var(--text-muted)", margin: "1rem 0" }}>{error}</p>
          <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
        </div>
      </main>
    );
  }

  const flag = targetUser?.country ? getCountryFlag(targetUser.country) : "🌍";

  return (
    <main className="chat-link-page">
      <div className="chat-link-card">
        <h2>Anonymous Profile</h2>

        <div className="link-user-info">
          <div className="link-avatar">{flag}</div>
          <h3>{targetUser?.name}</h3>
          <span className="link-uid">#{targetUser?.userId}</span>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {targetUser?.country}
          </p>
        </div>

        {user ? (
          <button className="btn btn-primary" onClick={handleStartChat} type="button">
            💬 Start Chat
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              Sign in to chat with this user
            </p>
            <Link to="/login" className="btn btn-primary" style={{ textAlign: "center" }}>
              Sign In
            </Link>
            <Link to="/register" className="btn" style={{ textAlign: "center" }}>
              Create Account
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
