// src/api/axios.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 180000, // 3 minutes — Mistral on CPU needs up to 2 min
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("eduai_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 globally ────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("eduai_token");
      localStorage.removeItem("eduai_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
