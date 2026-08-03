import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Dedicated hook for onboarding status management.
 * Isolates local storage / backend user onboarding completion state.
 */
export function useOnboarding() {
  const { user } = useAuthStore();
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    if (user?.onboarding_completed !== undefined) {
      setCompleted(Boolean(user.onboarding_completed));
    } else {
      const localValue = localStorage.getItem('nearby_onboarding_completed');
      setCompleted(localValue === 'true');
    }
  }, [user]);

  const completeOnboarding = () => {
    localStorage.setItem('nearby_onboarding_completed', 'true');
    setCompleted(true);
  };

  return {
    completed,
    completeOnboarding
  };
}

export default useOnboarding;
