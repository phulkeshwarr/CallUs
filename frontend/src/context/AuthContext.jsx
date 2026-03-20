import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken, setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }, []);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setAuthToken(token);
        const { data } = await api.get("/auth/me");
        setUser(data.user);
      } catch (error) {
        clearSession();
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [token, clearSession]);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }

  async function register(name, email, password, country) {
    const { data } = await api.post("/auth/register", { name, email, password, country });
    localStorage.setItem("token", data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    clearSession();
  }

  const value = useMemo(
    () => ({ token, user, loading, login, register, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
