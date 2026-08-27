import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  readOnboardingCompletion,
  writeOnboardingCompletion,
} from '@/features/onboarding/onboarding-storage';

export type OnboardingStatus = 'restoring' | 'pending' | 'completed';

export type OnboardingContextValue = Readonly<{
  completeOnboarding(): Promise<void>;
  status: OnboardingStatus;
}>;

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<OnboardingStatus>('restoring');

  useEffect(() => {
    let mounted = true;

    void readOnboardingCompletion()
      .then((completed) => {
        if (mounted) setStatus(completed ? 'completed' : 'pending');
      })
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Could not restore onboarding state.', error);
        if (mounted) setStatus('pending');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    setStatus('completed');
    try {
      await writeOnboardingCompletion();
    } catch (error) {
      // Onboarding is optional. A storage failure must never block sign-in.
      if (__DEV__) console.warn('Could not persist onboarding state.', error);
    }
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ completeOnboarding, status }),
    [completeOnboarding, status],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error('useOnboarding must be used within OnboardingProvider.');
  }
  return value;
}
