import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true
});

const getCookie = (name: string): string | undefined => {
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
};

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const csrfToken = getCookie("csrfToken");

  if (csrfToken) {
    config.headers["x-csrf-token"] = csrfToken;
  }

  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const url = originalRequest.url || "";

    const isRefreshRoute = url.includes("/auth/refresh");
    const isLoginRoute = url.includes("/auth/login");
    const isRegisterRoute = url.includes("/auth/register");

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (isLoginRoute || isRegisterRoute) {
      return Promise.reject(error);
    }

    if (isRefreshRoute) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post("/auth/refresh")
        .then((res) => {
          const newToken = res.data?.accessToken || null;

          if (newToken) {
            useAuthStore.getState().setToken(newToken);
          }

          return newToken;
        })
        .catch(() => {
          useAuthStore.getState().logout();
          return null;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newToken = await refreshPromise;

    if (!newToken) {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;

    return api(originalRequest);
  }
);