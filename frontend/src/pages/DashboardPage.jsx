import { Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { UserList } from "../components/UserList";
import { CallPanel } from "../components/CallPanel";
import { IncomingCallModal } from "../components/IncomingCallModal";
import { useAuth } from "../context/AuthContext";

export function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="screen-center">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="dashboard">
      <Header />
      <section className="dashboard-grid">
        <UserList />
        <CallPanel />
      </section>
      <IncomingCallModal />
    </main>
  );
}