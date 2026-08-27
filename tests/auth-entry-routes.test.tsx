import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

const mockUseAuth = jest.fn();
const mockUseOnboarding = jest.fn();

jest.mock('@/features/auth/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));
jest.mock('@/features/onboarding/onboarding-context', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));
jest.mock('@/features/auth/login-screen', () => {
  const ReactNative = require('react-native');
  return {
    LoginScreen: () => <ReactNative.Text>login-screen</ReactNative.Text>,
  };
});
jest.mock('@/features/onboarding/onboarding-screen', () => {
  const ReactNative = require('react-native');
  return {
    OnboardingScreen: () => (
      <ReactNative.Text>onboarding-screen</ReactNative.Text>
    ),
  };
});
jest.mock('expo-router', () => {
  const ReactNative = require('react-native');
  return {
    Redirect: ({ href }: { href: string }) => (
      <ReactNative.Text>{`redirect:${href}`}</ReactNative.Text>
    ),
    useRouter: () => ({ replace: jest.fn() }),
  };
});

import AuthIndexRoute from '@/app/(auth)/index';
import LoginRoute from '@/app/(auth)/login';

describe('signed-out entry routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ status: 'signed_out' });
  });

  it('routes a first installation to welcome', async () => {
    mockUseOnboarding.mockReturnValue({ status: 'pending' });

    await render(<AuthIndexRoute />);

    expect(screen.getByText('onboarding-screen')).toBeOnTheScreen();
  });

  it('routes a completed installation to login', async () => {
    mockUseOnboarding.mockReturnValue({ status: 'completed' });

    await render(<AuthIndexRoute />);

    expect(screen.getByText('login-screen')).toBeOnTheScreen();
  });

  it('protects the direct login route until onboarding is complete', async () => {
    mockUseOnboarding.mockReturnValue({ status: 'pending' });

    await render(<LoginRoute />);

    expect(screen.getByText('redirect:/welcome')).toBeOnTheScreen();
  });

  it('bypasses welcome when Google reauthentication is required', async () => {
    mockUseAuth.mockReturnValue({ status: 'reauth_required' });
    mockUseOnboarding.mockReturnValue({ status: 'pending' });

    await render(<LoginRoute />);

    expect(screen.getByText('login-screen')).toBeOnTheScreen();
  });
});
