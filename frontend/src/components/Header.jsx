import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// The initial theme was set on <html> by the inline script in index.html.
const currentTheme = () =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(currentTheme);

  async function onLogout() {
    await logout();
    navigate("/login");
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
    setTheme(next);
  }

  return (
    <header className="header">
      <Link to="/" className="brand">🔐 PW Pusher</Link>
      <div className="header-right">
        <button
          type="button"
          className="btn-icon"
          onClick={toggleTheme}
          aria-label="Toggle light or dark theme"
          title="Toggle light/dark"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        {user && (
          <>
            <span className="muted">{user.email}</span>
            <button className="btn-ghost" onClick={onLogout}>Log out</button>
          </>
        )}
      </div>
    </header>
  );
}
