import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: () => set({ isAuthenticated: true }),
  clearAuth: () => set({ isAuthenticated: false }),
}));
