import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthForm from "../components/AuthForm.jsx";

export default function AuthPage() {
  const { user, onAuthSuccess } = useAuth();
  const navigate = useNavigate();

  // Already logged in? Go to the dashboard.
  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  return (
    <div className="auth-wrap">
      <p className="tagline">Share a password or secret with a link that expires.</p>
      <AuthForm
        onSuccess={(data) => {
          onAuthSuccess(data);
          navigate("/");
        }}
      />
    </div>
  );
}
