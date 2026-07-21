import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isRestoring: true,

  setSession: (user) => set({
    user,
    isAuthenticated: !!user,
    isRestoring: false,
  }),

  logout: () => set({
    user: null,
    isAuthenticated: false,
    isRestoring: false,
  }),

  finishRestoring: () => set({
    isRestoring: false,
  }),
}));
