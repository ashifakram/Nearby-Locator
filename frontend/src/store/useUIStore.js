import { create } from 'zustand';

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('nearby_locator_theme');
    if (saved !== null) return saved === 'dark';
  } catch (e) {}
  return false; // Default to Light Mode per Landing Page design language spec
};

export const useUIStore = create((set) => ({
  isDark: getInitialTheme(),
  sidebarOpen: false,
  isNetworkOffline: false,
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDark;
      try {
        localStorage.setItem('nearby_locator_theme', next ? 'dark' : 'light');
      } catch (e) {}
      return { isDark: next };
    }),
  setTheme: (isDark) => {
    try {
      localStorage.setItem('nearby_locator_theme', isDark ? 'dark' : 'light');
    } catch (e) {}
    set({ isDark });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (isOpen) => set({ sidebarOpen: isOpen }),
  setNetworkOffline: (isOffline) => set({ isNetworkOffline: isOffline }),
}));
