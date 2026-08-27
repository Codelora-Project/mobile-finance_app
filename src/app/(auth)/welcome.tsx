import { Redirect, useRouter } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';

export default function WelcomeRoute() {
  const router = useRouter();
  const { status } = useAuth();
  const { completeOnboarding, status: onboardingStatus } = useOnboarding();

  if (status === 'reauth_required' || onboardingStatus === 'completed') {
    return <Redirect href="/login" />;
  }

  return (
    <OnboardingScreen
      mode="first_run"
      onFinish={async () => {
        await completeOnboarding();
        router.replace('/login');
      }}
    />
  );
}
