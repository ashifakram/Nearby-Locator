import { QueryClient } from '@tanstack/react-query';
import { logger } from '../utils/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      gcTime: 300000,   // 5 minutes
      refetchOnWindowFocus: false, // Avoid excessive duplicate calls
      retry: (failureCount, error) => {
        // Do not retry authorization or bad request failures
        if (error?.response) {
          const status = error.response.status;
          if (status === 401 || status === 403 || status === 400 || status === 422) {
            return false;
          }
        }
        // Retry ordinary network failures up to 2 times
        if (failureCount < 2) {
          logger.warn(`Network retry ${failureCount + 1} for failed query...`);
          return true;
        }
        return false;
      },
    },
  },
});
