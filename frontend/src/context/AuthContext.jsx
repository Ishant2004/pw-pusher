import { createContext, useContext, useEffect, useState } from "react";
import { setAccessToken, tryRefresh, apiMe, apiLogout } from "../lib/api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to restore the session from the refresh cookie.
  useEffect(() => {
    (async () => {
      if (await tryRefresh()) {
        try {
          const { user } = await apiMe();
          setUser(user);
        } catch {
          /* not logged in */
        }
      }
      setLoading(false);
    })();
  }, []);

  // Called after a successful login / verify / google / reset.
  function onAuthSuccess({ user, accessToken }) {
    setAccessToken(accessToken);
    setUser(user);
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, onAuthSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
