import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetItemAsync = jest.fn<(key: string) => Promise<string | null>>();
const mockSetItemAsync =
  jest.fn<(key: string, value: string) => Promise<void>>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: [string]) => mockGetItemAsync(...args),
  setItemAsync: (...args: [string, string]) => mockSetItemAsync(...args),
}));

import {
  readOnboardingCompletion,
  writeOnboardingCompletion,
} from '@/features/onboarding/onboarding-storage';

describe('onboarding storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('restores only the current version marker as completed', async () => {
    mockGetItemAsync
      .mockResolvedValueOnce('1')
      .mockResolvedValueOnce('damaged');

    await expect(readOnboardingCompletion()).resolves.toBe(true);
    await expect(readOnboardingCompletion()).resolves.toBe(false);
  });

  it('persists the versioned completion marker', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);

    await writeOnboardingCompletion();

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      'finance.onboarding.v1.completed',
      '1',
    );
  });
});
