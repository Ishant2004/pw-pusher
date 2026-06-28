import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthForm from "../components/AuthForm.jsx";
import { decryptSecret } from "../lib/crypto.js";
import { apiViewSecret, ApiError } from "../lib/api.js";

export default function ViewerPage() {
  const { token } = useParams();
  const { user, loading, onAuthSuccess } = useAuth();
  // The decryption key is in the URL fragment (never sent to the server).
  const key = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";

  const [content, setContent] = useState(null);
  const [burned, setBurned] = useState(false);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function reveal() {
    setError("");
    setBusy(true);
    try {
      const { payload, meta, burned } = await apiViewSecret(token); // ciphertext + metadata
      const text = await decryptSecret(payload, key); // decrypt locally
      setContent(text);
      setMeta(meta);
      setBurned(burned);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open this secret");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!key) {
    return (
      <div className="card center">
        <h2>Broken link</h2>
        <p className="muted">This link is missing its decryption key, so it can't be opened.</p>
      </div>
    );
  }

  // Wait for the session check before deciding whether to show the login form.
  if (loading) return <div className="center muted">Loading…</div>;

  // Not logged in: show login right here so the #key stays in the URL.
  if (!user) {
    return (
      <div className="auth-wrap">
        <div className="card info-card">
          <strong>🔐 Someone shared a secret with you.</strong>
          <p className="muted">Log in or create a free account to view it.</p>
        </div>
        <AuthForm onSuccess={onAuthSuccess} />
      </div>
    );
  }

  if (content !== null) {
    const viewsLeft = meta?.maxViews ? meta.maxViews - meta.viewCount : null;
    return (
      <div className="card viewer">
        <h2>Secret</h2>
        <pre className="secret-content">{content}</pre>
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied!" : "Copy to clipboard"}</button>
        {burned ? (
          <div className="alert alert-info">That was the last allowed view — this secret has now been destroyed.</div>
        ) : viewsLeft != null ? (
          <div className="alert alert-info">
            {viewsLeft} more view{viewsLeft === 1 ? "" : "s"} left before this is destroyed.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="card center viewer">
      <h2>A secret is waiting for you</h2>
      <p className="muted">Opening it counts as one view, so reveal it only when you're ready.</p>
      {error && <div className="alert alert-error">{error}</div>}
      <button type="button" className="btn" onClick={reveal} disabled={busy}>
        {busy ? "Decrypting…" : "Reveal secret"}
      </button>
    </div>
  );
}
