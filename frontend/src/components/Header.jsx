import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCountryFlag } from "../data/countries";

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function handleShare() {
    const link = `${window.location.origin}/chat/${user?.userId}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const flag = user?.country ? getCountryFlag(user.country) : "🌍";

  return (
    <header className="header">
      <h1>Call.io</h1>
      <div className="header-right">
        <div className="header-user-info">
          <span className="user-flag">{flag}</span>
          <span className="user-name" title={user?.name}>
            {user?.name?.length > 7 ? user.name.slice(0, 7) + ".." : user?.name}
          </span>
          <span className="header-user-id">#{user?.userId}</span>
        </div>

        <button
          className={`share-btn ${copied ? "copied" : ""}`}
          onClick={handleShare}
          type="button"
          title="Copy your shareable chat link"
        >
          {copied ? "✓ Copied!" : "📋 Share ID"}
        </button>

        <button className="btn btn-sm" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}