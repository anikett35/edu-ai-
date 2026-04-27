// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { authService } from "../api/services";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("eduai_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const register = useCallback(async (formData) => {
    setLoading(true);
    setError(null);
    try {
      await authService.register(formData);
      const res = await authService.login({
        email:    formData.email,
        password: formData.password,
      });
      _persist(res.data, { name: formData.name, email: formData.email });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(credentials);
      _persist(res.data, { email: credentials.email });
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Invalid email or password";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("eduai_token");
    localStorage.removeItem("eduai_user");
    setUser(null);
  }, []);

  function _persist(data, extra = {}) {
    const userData = {
      user_id: data.user_id,
      role:    data.role,
      token:   data.access_token,
      name:    extra.name  || "",
      email:   extra.email || "",
    };
    localStorage.setItem("eduai_token", data.access_token);
    localStorage.setItem("eduai_user",  JSON.stringify(userData));
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}