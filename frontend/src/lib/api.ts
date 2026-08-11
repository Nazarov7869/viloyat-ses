import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001/api";

const ACCESS_KEY = "ses_access_token";
const REFRESH_KEY = "ses_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh?: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
    tokenStorage.setTokens(data.access, data.refresh);
    return data.access as string;
  } catch {
    tokenStorage.clear();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthEndpoint = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/register");

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint && tokenStorage.getRefresh()) {
      original._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown, fallback = "Xatolik yuz berdi"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | string | undefined;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      if (typeof data.detail === "string") return data.detail;
      const firstKey = Object.keys(data)[0];
      const val = firstKey ? data[firstKey] : undefined;
      if (Array.isArray(val) && typeof val[0] === "string") return val[0];
      if (typeof val === "string") return val;
    }
  }
  return fallback;
}

export default api;
