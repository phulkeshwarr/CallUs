import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="header">
      <h1>Call.io</h1>
      <div className="header-right">
        <span>{user?.name}</span>
        <button className="btn" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}