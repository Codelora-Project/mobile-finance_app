import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Pressable, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import type { AuthSession } from '@/features/auth/auth-types';

const mockReadAuthSession = jest.fn<() => Promise<AuthSession | null>>();
const mockWriteAuthSession = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockDeleteAuthSession = jest.fn<() => Promise<void>>();
const mockNetworkState = jest.fn<() => Promise<unknown>>();
const mockInteractiveSignIn = jest.fn<() => Promise<unknown>>();
const mockSilentSignIn = jest.fn<() => Promise<unknown>>();
const mockNativeSignOut = jest.fn<() => Promise<void>>();
const mockClearSensitiveCache = jest.fn();

jest.mock('expo-network', () => ({
  getNetworkStateAsync: () => mockNetworkState(),
}));
jest.mock('@/features/auth/auth-storage', () => ({
  deleteAuthSession: () => mockDeleteAuthSession(),
  readAuthSession: () => mockReadAuthSession(),
  writeAuthSession: (...args: unknown[]) => mockWriteAuthSession(...args),
}));
jest.mock('@/features/auth/google-auth-service', () => {
  class MockGoogleAuthError extends Error {}
  return {
    configureGoogleAuth: jest.fn(),
    GoogleAuthError: MockGoogleAuthError,
    signInWithGoogle: () => mockInteractiveSignIn(),
    signOutFromGoogle: () => mockNativeSignOut(),
    silentlyValidateGoogleSession: () => mockSilentSignIn(),
    toAuthErrorState: (error: unknown) => ({
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'unknown',
    }),
  };
});
jest.mock('@/lib/storage/sensitive-cache', () => ({
  clearSensitiveCache: () => mockClearSensitiveCache(),
}));

const session: AuthSession = {
  lastVerifiedAt: 1_700_000_000_000,
  user: {
    email: 'dina@example.com',
    id: 'google-user-1',
    name: 'Dina',
    photoUrl: null,
  },
  version: 1,
};

function AuthProbe() {
  const auth = useAuth();
  return (
    <View>
      <Text testID="status">{auth.status}</Text>
      <Text testID="user">{auth.user?.email ?? 'none'}</Text>
      <Text testID="error">{auth.error?.code ?? 'none'}</Text>
      <Pressable accessibilityRole="button" onPress={auth.signInWithGoogle}>
        <Text>Sign in</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={auth.signOut}>
        <Text>Sign out</Text>
      </Pressable>
    </View>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );
}

describe('AuthProvider offline-first session handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAuthSession.mockResolvedValue(undefined);
    mockWriteAuthSession.mockResolvedValue(undefined);
    mockNativeSignOut.mockResolvedValue(undefined);
    mockSilentSignIn.mockResolvedValue({ kind: 'success', session });
  });

  it('opens a stored account while offline without requiring Google', async () => {
    mockReadAuthSession.mockResolvedValue(session);
    mockNetworkState.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed_in'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('dina@example.com');
    expect(mockSilentSignIn).not.toHaveBeenCalled();
  });

  it('requires reauthentication only when Google reports no saved credential', async () => {
    mockReadAuthSession.mockResolvedValue(session);
    mockNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    mockSilentSignIn.mockResolvedValue({ kind: 'no_saved_credential' });
    renderAuth();

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('reauth_required'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(mockDeleteAuthSession).toHaveBeenCalled();
  });

  it('persists only the structured local session after interactive login', async () => {
    mockReadAuthSession.mockResolvedValue(null);
    mockNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    mockInteractiveSignIn.mockResolvedValue({ kind: 'success', session });
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed_out'),
    );

    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(mockWriteAuthSession).toHaveBeenCalledWith(session),
    );
    expect(screen.getByTestId('status')).toHaveTextContent('signed_in');
  });

  it('blocks a first login offline and leaves the account signed out', async () => {
    mockReadAuthSession.mockResolvedValue(null);
    mockNetworkState.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed_out'),
    );

    fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent('OFFLINE'),
    );
    expect(mockInteractiveSignIn).not.toHaveBeenCalled();
  });

  it('clears the local session and cache even if native sign-out fails', async () => {
    mockReadAuthSession.mockResolvedValue(session);
    mockNetworkState.mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
    });
    mockNativeSignOut.mockRejectedValue(new Error('offline'));
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed_in'),
    );

    fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('signed_out'),
    );
    expect(mockDeleteAuthSession).toHaveBeenCalled();
    expect(mockClearSensitiveCache).toHaveBeenCalled();
  });
});
