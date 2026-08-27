import * as SecureStore from 'expo-secure-store';

const ONBOARDING_COMPLETED_KEY = 'finance.onboarding.v1.completed';
const COMPLETED_VALUE = '1';

export async function readOnboardingCompletion() {
  return (
    (await SecureStore.getItemAsync(ONBOARDING_COMPLETED_KEY)) ===
    COMPLETED_VALUE
  );
}

export async function writeOnboardingCompletion() {
  await SecureStore.setItemAsync(ONBOARDING_COMPLETED_KEY, COMPLETED_VALUE);
}
