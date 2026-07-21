export const queryKeys = {
  spots: {
    all: ['spots'],
    lists: () => [...queryKeys.spots.all, 'list'],
    list: (filters) => [...queryKeys.spots.lists(), filters],
    details: () => [...queryKeys.spots.all, 'detail'],
    detail: (id) => [...queryKeys.spots.details(), id],
  },
  moderation: {
    all: ['moderation'],
    queues: () => [...queryKeys.moderation.all, 'queue'],
    queue: (status) => [...queryKeys.moderation.queues(), status],
  },
  auth: {
    profile: () => ['auth', 'profile'],
  }
};
