import { Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { UserList } from "../components/UserList";
import { CallPanel } from "../components/CallPanel";
import { ChatPanel } from "../components/ChatPanel";
import { IncomingCallModal } from "../components/IncomingCallModal";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="screen-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="dashboard">
      <Header />
      <div className="dashboard-body">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h3>People Online</h3>
          </div>
          <UserList />
        </aside>
        <div className="main-area">
          <CallPanel />
        </div>
        <ChatPanel />
      </div>
      <IncomingCallModal />
    </main>
  );
}