// src/initAuth.ts
import { api } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

export const initAuth = async () => {
  try {
    const res = await api.post("/auth/refresh");
    if (res.data?.accessToken) {
      useAuthStore.getState().setToken(res.data.accessToken);
    } else {
      useAuthStore.getState().setInitialized(true);
    }
  } catch {
    useAuthStore.getState().logout();
  }
};