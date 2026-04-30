// src/initAuth.ts
import { api } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

export const initAuth = async () => {
  try {
    const res = await api.post("/auth/refresh");
    useAuthStore.getState().setToken(res.data.accessToken);
  } catch {
    useAuthStore.getState().logout();
  }
};