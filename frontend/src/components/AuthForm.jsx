import { useState } from "react";
import {
  apiSignup,
  apiVerifyEmail,
  apiResend,
  apiLogin,
  apiGoogle,
  apiForgot,
  apiReset,
  ApiError,
} from "../lib/api.js";
import GoogleButton from "./GoogleButton.jsx";

const TITLES = {
  login: "Log in",
  signup: "Create your account",
  verify: "Verify your email",
  forgot: "Reset your password",
  reset: "Set a new password",
};
const ACTIONS = {
  login: "Log in",
  signup: "Sign up",
  verify: "Verify",
  forgot: "Send reset code",
  reset: "Reset password",
};

// Reusable auth form. Calls onSuccess({ user, accessToken }) once the user is in.
export default function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState("login"); // login | signup | verify | forgot | reset
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  function switchTo(m) {
    setMode(m);
    setError("");
    setInfo("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "login") {
        try {
          onSuccess(await apiLogin(email, password));
        } catch (err) {
          if (err instanceof ApiError && err.code === "EMAIL_UNVERIFIED") {
            setMode("verify");
            setInfo("Enter the 6-digit code we emailed you.");
          } else throw err;
        }
      } else if (mode === "signup") {
        await apiSignup(email, password);
        setMode("verify");
        setInfo("We emailed you a 6-digit code.");
      } else if (mode === "verify") {
        onSuccess(await apiVerifyEmail(email, code));
      } else if (mode === "forgot") {
        await apiForgot(email);
        setMode("reset");
        setInfo("If that account exists, a reset code was sent.");
      } else if (mode === "reset") {
        onSuccess(await apiReset(email, code, password));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    setInfo("");
    try {
      await apiResend(email);
      setInfo("New code sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resend");
    }
  }

  const showEmail = mode === "login" || mode === "signup" || mode === "forgot";
  const showCode = mode === "verify" || mode === "reset";
  const showPassword = mode === "login" || mode === "signup" || mode === "reset";

  return (
    <div className="card">
      <h2>{TITLES[mode]}</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <form onSubmit={submit} className="form">
        {showEmail && (
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
        )}
        {showCode && <p className="muted">Code sent to <strong>{email}</strong></p>}
        {showCode && (
          <label>
            6-digit code
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
        )}
        {showPassword && (
          <label>
            {mode === "reset" ? "New password" : "Password"}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
        )}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "…" : ACTIONS[mode]}
        </button>
      </form>

      {(mode === "login" || mode === "signup") && (
        <>
          <div className="divider">or</div>
          <GoogleButton onCredential={async (idToken) => {
            setError("");
            try {
              onSuccess(await apiGoogle(idToken));
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Google sign-in failed");
            }
          }} />
        </>
      )}

      <div className="links">
        {mode === "login" && (
          <>
            <button type="button" className="link" onClick={() => switchTo("signup")}>Create account</button>
            <button type="button" className="link" onClick={() => switchTo("forgot")}>Forgot password?</button>
          </>
        )}
        {mode === "signup" && (
          <button type="button" className="link" onClick={() => switchTo("login")}>I already have an account</button>
        )}
        {mode === "verify" && (
          <button type="button" className="link" onClick={resend}>Resend code</button>
        )}
        {(mode === "forgot" || mode === "reset") && (
          <button type="button" className="link" onClick={() => switchTo("login")}>Back to login</button>
        )}
      </div>
    </div>
  );
}
