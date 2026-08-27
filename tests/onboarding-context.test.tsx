import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { Button, Text } from 'react-native';

const mockReadOnboardingCompletion = jest.fn<() => Promise<boolean>>();
const mockWriteOnboardingCompletion = jest.fn<() => Promise<void>>();

jest.mock('@/features/onboarding/onboarding-storage', () => ({
  readOnboardingCompletion: () => mockReadOnboardingCompletion(),
  writeOnboardingCompletion: () => mockWriteOnboardingCompletion(),
}));

import {
  OnboardingProvider,
  useOnboarding,
} from '@/features/onboarding/onboarding-context';

function Probe() {
  const { completeOnboarding, status } = useOnboarding();
  return (
    <>
      <Text>{status}</Text>
      <Button
        onPress={() => void completeOnboarding()}
        title="Complete onboarding"
      />
    </>
  );
}

describe('OnboardingProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores a pending first-run state', async () => {
    mockReadOnboardingCompletion.mockResolvedValue(false);

    await render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );

    expect(await screen.findByText('pending')).toBeOnTheScreen();
  });

  it('falls back to pending when storage cannot be read', async () => {
    mockReadOnboardingCompletion.mockRejectedValue(new Error('unavailable'));

    await render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );

    expect(await screen.findByText('pending')).toBeOnTheScreen();
  });

  it('completes in memory even when persistence fails', async () => {
    mockReadOnboardingCompletion.mockResolvedValue(false);
    mockWriteOnboardingCompletion.mockRejectedValue(new Error('write failed'));

    await render(
      <OnboardingProvider>
        <Probe />
      </OnboardingProvider>,
    );
    await screen.findByText('pending');

    await fireEvent.press(
      screen.getByRole('button', { name: 'Complete onboarding' }),
    );

    await waitFor(() =>
      expect(screen.getByText('completed')).toBeOnTheScreen(),
    );
    expect(mockWriteOnboardingCompletion).toHaveBeenCalledTimes(1);
  });
});
