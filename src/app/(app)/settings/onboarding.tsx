import { useRouter } from 'expo-router';

import { OnboardingScreen } from '@/features/onboarding/onboarding-screen';

export default function OnboardingReplayRoute() {
  const router = useRouter();

  return <OnboardingScreen mode="replay" onFinish={() => router.back()} />;
}
