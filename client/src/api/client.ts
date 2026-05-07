// src/api/client.ts
import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";

// Create axios instance
export const api = axios.create({
  baseURL: "http://localhost:3000/api",
  withCredentials: true,
});

// 🔐 Helper to read cookies
const getCookie = (name: string): string | undefined => {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
};

//
// 🧠 REQUEST INTERCEPTOR (CSRF + access token)
//
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Attach CSRF token
  const csrfToken = getCookie("csrfToken");
  if (csrfToken) {
    config.headers["x-csrf-token"] = csrfToken;
  }

  // Attach access token (optional but recommended)
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

//
// 🔁 RESPONSE INTERCEPTOR (refresh + retry)
//

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean; //add _retry to error config
    };

    const isAuthRoute =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh");

    // ❌ If no config or already retried → fail
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // ❌ Only handle 401
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // if error is 401 and not auth route, logout and send error
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    // ❌ Prevent infinite loop on refresh endpoint itself
    if (originalRequest.url?.includes("/auth/refresh")) {
      useAuthStore.getState().logout();
      return Promise.resolve({ 
        data: { accessToken: null }, 
        status: 200,
        statusText: 'OK',
        headers: {},
        config: originalRequest
      });
    }

    originalRequest._retry = true;

    try {
      // 🧠 Ensure only one refresh call happens
      if (!isRefreshing) {
        isRefreshing = true;

        refreshPromise = api
          .post("/auth/refresh")
          .then((res) => {
            const newToken = res.data.accessToken;
            useAuthStore.getState().setToken(newToken);
            return newToken;
          })
          .catch((err) => {
            useAuthStore.getState().logout();
            console.log(err)
            return null;
          })
          .finally(() => {
            isRefreshing = false;
          });
      }

      const newToken = await refreshPromise;

      if (!newToken) {
        return Promise.reject(error);
      }

      // 🔁 Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);

    } catch (err) {
      return Promise.reject(err);
    }
  }
);