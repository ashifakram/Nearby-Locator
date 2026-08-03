export const queryKeys = {
  spots: {
    all: ['spots'],
    lists: () => [...queryKeys.spots.all, 'list'],
    list: (filters) => [...queryKeys.spots.lists(), filters],
    details: () => [...queryKeys.spots.all, 'detail'],
    detail: (id) => [...queryKeys.spots.details(), id],
    saves: (params) => [...queryKeys.spots.all, 'saves', params],
    history: (params) => [...queryKeys.spots.all, 'history', params],
  },
  moderation: {
    all: ['moderation'],
    queues: () => [...queryKeys.moderation.all, 'queue'],
    queue: (status) => [...queryKeys.moderation.queues(), status],
  },
  auth: {
    profile: () => ['auth', 'profile'],
  },
  admin: {
    all: ['admin'],
    users: (params) => [...queryKeys.admin.all, 'users', params],
  },
  settings: {
    all: ['settings'],
    profile: () => [...queryKeys.settings.all, 'profile'],
    notifications: () => [...queryKeys.settings.all, 'notifications'],
    preferences: () => [...queryKeys.settings.all, 'preferences'],
    privacy: () => [...queryKeys.settings.all, 'privacy'],
    sessions: () => [...queryKeys.settings.all, 'sessions'],
  }
};

