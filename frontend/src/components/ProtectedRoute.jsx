import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Only render children if logged in; otherwise send to /login.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
