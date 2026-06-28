// Tiny wrapper around fetch. Adds the access token, sends cookies, and refreshes
// the access token once if it has expired.

const BASE = import.meta.env.VITE_API_URL || ""; // "" -> Vite proxy in dev

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function doFetch(path, { method, body, withAuth }) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (withAuth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(BASE + path, {
    method: method || "GET",
    headers,
    credentials: "include", // send/receive the refresh cookie
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function request(path, opts = {}) {
  let res = await doFetch(path, opts);

  // Access token expired? Refresh once and retry.
  if (res.status === 401 && opts.withAuth && accessToken) {
    if (await tryRefresh()) res = await doFetch(path, opts);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError(err.message || "Request failed", err.code, res.status);
  }
  return data;
}

export async function tryRefresh() {
  try {
    const res = await fetch(BASE + "/api/auth/refresh", { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const { accessToken: token } = await res.json();
    setAccessToken(token);
    return true;
  } catch {
    return false;
  }
}

// ---- auth ----
export const apiSignup = (email, password) => request("/api/auth/signup", { method: "POST", body: { email, password } });
export const apiVerifyEmail = (email, code) => request("/api/auth/verify-email", { method: "POST", body: { email, code } });
export const apiResend = (email) => request("/api/auth/resend-verification", { method: "POST", body: { email } });
export const apiLogin = (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } });
export const apiGoogle = (idToken) => request("/api/auth/google", { method: "POST", body: { idToken } });
export const apiForgot = (email) => request("/api/auth/forgot-password", { method: "POST", body: { email } });
export const apiReset = (email, code, password) => request("/api/auth/reset-password", { method: "POST", body: { email, code, password } });
export const apiLogout = () => request("/api/auth/logout", { method: "POST" });
export const apiMe = () => request("/api/auth/me", { withAuth: true });

// ---- secrets ----
export const apiCreateSecret = (payload, expiresInSeconds, maxViews) =>
  request("/api/secrets", { method: "POST", withAuth: true, body: { payload, expiresInSeconds, maxViews } });
export const apiListSecrets = () => request("/api/secrets", { withAuth: true });
export const apiViewSecret = (token) => request(`/api/secrets/${token}`, { withAuth: true });
export const apiDeleteSecret = (token) => request(`/api/secrets/${token}`, { method: "DELETE", withAuth: true });
