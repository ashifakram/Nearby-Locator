import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  status: 'UNKNOWN', // 'UNKNOWN' | 'AUTHENTICATED' | 'UNAUTHENTICATED'
  navigationEvent: null,
  roles: [],
  permissions: [],
  permissionVersion: 0,
  permissionState: 'UNKNOWN', // 'UNKNOWN' | 'LOADING' | 'READY' | 'FAILED'

  setSession: (user) => set({
    user,
    status: user ? 'AUTHENTICATED' : 'UNAUTHENTICATED',
  }),

  setUser: (user) => set((state) => ({
    user: typeof user === 'function' ? user(state.user) : user,
    status: user ? 'AUTHENTICATED' : state.status
  })),

  updateUser: (partialUser) => set((state) => ({
    user: state.user ? { ...state.user, ...partialUser } : partialUser
  })),


  logout: () => set({
    user: null,
    status: 'UNAUTHENTICATED',
    navigationEvent: null,
    roles: [],
    permissions: [],
    permissionVersion: 0,
    permissionState: 'UNKNOWN',
  }),

  setPermissions: (roles, permissions, version) => set({
    roles: roles || [],
    permissions: permissions || [],
    permissionVersion: version || 0,
    permissionState: 'READY',
  }),

  setPermissionLoading: () => set({
    permissionState: 'LOADING',
  }),

  setPermissionFailed: () => set({
    roles: [],
    permissions: [],
    permissionVersion: 0,
    permissionState: 'FAILED',
  }),

  finishRestoring: () => set((state) => ({
    status: state.status === 'UNKNOWN' ? 'UNAUTHENTICATED' : state.status,
  })),

  triggerNavigation: (path) => set({
    navigationEvent: path,
  }),

  clearNavigation: () => set({
    navigationEvent: null,
  }),
}));
