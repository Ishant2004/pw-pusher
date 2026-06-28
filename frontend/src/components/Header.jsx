import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="header">
      <Link to="/" className="brand">🔐 PW Pusher</Link>
      {user && (
        <div className="header-right">
          <span className="muted">{user.email}</span>
          <button className="btn-ghost" onClick={onLogout}>Log out</button>
        </div>
      )}
    </header>
  );
}
