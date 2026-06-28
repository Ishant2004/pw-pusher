import { useEffect, useState } from "react";
import { encryptSecret, buildShareUrl } from "../lib/crypto.js";
import { apiCreateSecret, apiListSecrets, apiDeleteSecret, ApiError } from "../lib/api.js";

const EXPIRY_OPTIONS = [
  { label: "5 minutes", value: 5 * 60 },
  { label: "15 minutes", value: 15 * 60 },
  { label: "30 minutes", value: 30 * 60 },
  { label: "1 hour", value: 60 * 60 },
  { label: "3 hours", value: 3 * 60 * 60 },
  { label: "6 hours", value: 6 * 60 * 60 },
  { label: "12 hours", value: 12 * 60 * 60 },
  { label: "1 day", value: 24 * 60 * 60 },
  { label: "2 days", value: 2 * 24 * 60 * 60 },
  { label: "3 days", value: 3 * 24 * 60 * 60 },
  { label: "4 days", value: 4 * 24 * 60 * 60 },
  { label: "5 days", value: 5 * 24 * 60 * 60 },
];

const VIEW_OPTIONS = [1, 2, 3, 4, 5];

export default function DashboardPage() {
  const [body, setBody] = useState("");
  const [expiry, setExpiry] = useState(4 * 24 * 60 * 60);
  const [maxViews, setMaxViews] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [secrets, setSecrets] = useState([]);

  async function loadSecrets() {
    try {
      const data = await apiListSecrets();
      setSecrets(data.secrets);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadSecrets();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    setShareUrl("");
    setCopied(false);
    setBusy(true);
    try {
      // 1) encrypt in the browser  2) send only ciphertext  3) build the link with the key
      const { key, payload } = await encryptSecret(body);
      const { token } = await apiCreateSecret(payload, expiry, maxViews);
      setShareUrl(buildShareUrl(token, key));
      setBody("");
      loadSecrets();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create secret");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function revoke(token) {
    await apiDeleteSecret(token).catch(() => {});
    loadSecrets();
  }

  return (
    <div className="dashboard">
      <div className="card">
        <h2>Create a secret</h2>
        <form onSubmit={onCreate} className="form">
          <label>
            Secret content
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste a password, API key, private note…"
              required
            />
          </label>
          <div className="row">
            <label>
              Expires after
              <select value={expiry} onChange={(e) => setExpiry(Number(e.target.value))}>
                {EXPIRY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label>
              Delete after
              <select value={maxViews} onChange={(e) => setMaxViews(Number(e.target.value))}>
                {VIEW_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} view{n > 1 ? "s" : ""}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn" disabled={busy || !body}>
            {busy ? "Encrypting…" : "Create secret link"}
          </button>
        </form>

        {shareUrl && (
          <div className="share">
            <p className="muted">
              Share this link. The recipient must log in to view it. It's end-to-end encrypted —
              the key lives in the link, never on our server.
            </p>
            <div className="share-row">
              <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <button type="button" className="btn" onClick={copy}>{copied ? "Copied!" : "Copy"}</button>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Your active secrets</h2>
        {secrets.length === 0 ? (
          <p className="muted">No active secrets yet.</p>
        ) : (
          <table className="secrets">
            <thead>
              <tr><th>Created</th><th>Expires</th><th>Views</th><th></th></tr>
            </thead>
            <tbody>
              {secrets.map((s) => (
                <tr key={s.token}>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{new Date(s.expiresAt).toLocaleString()}</td>
                  <td>{s.viewCount}{s.maxViews ? ` / ${s.maxViews}` : ""}</td>
                  <td><button className="link danger" onClick={() => revoke(s.token)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">
          The full link is shown only once, at creation — we can't reconstruct it because the key never reaches us.
        </p>
      </div>
    </div>
  );
}
