// src/store/authStore.ts
import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  isInitialized: boolean;
  setToken: (token: string) => void;
  setInitialized: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isInitialized: false,
  setToken: (token) => set({ accessToken: token, isInitialized: true }),
  setInitialized: (val) => set({ isInitialized: val }),
  logout: () => set({ accessToken: null, isInitialized: true }),
}));