import { useRouter } from 'expo-router';

import { useAuth } from '@/features/auth/auth-context';
import { LoginScreen } from '@/features/auth/login-screen';
import { useOnboarding } from '@/features/onboarding/onboarding-context';
import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';

export default function AuthIndexRoute() {
  const router = useRouter();
  const { status } = useAuth();
  const { completeOnboarding, status: onboardingStatus } = useOnboarding();

  if (status === 'reauth_required' || onboardingStatus === 'completed') {
    return <LoginScreen />;
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
