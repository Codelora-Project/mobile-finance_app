import * as Network from 'expo-network';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  deleteAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/features/auth/auth-storage';
import type {
  AuthContextValue,
  AuthErrorState,
  AuthSession,
  AuthStatus,
} from '@/features/auth/auth-types';
import {
  configureGoogleAuth,
  GoogleAuthError,
  signInWithGoogle as performGoogleSignIn,
  signOutFromGoogle,
  silentlyValidateGoogleSession,
  toAuthErrorState,
} from '@/features/auth/google-auth-service';
import { clearSensitiveCache } from '@/lib/storage/sensitive-cache';

const AuthContext = createContext<AuthContextValue | null>(null);

function clearSensitiveCacheSafely() {
  try {
    clearSensitiveCache();
  } catch {
    // Auth state must not depend on best-effort cache cleanup.
  }
}

async function canReachInternet() {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [error, setError] = useState<AuthErrorState | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const operationId = useRef(0);

  useEffect(() => {
    let mounted = true;
    const currentOperation = ++operationId.current;

    async function restore() {
      configureGoogleAuth();
      const storedSession = await readAuthSession();
      if (!mounted || operationId.current !== currentOperation) return;
      if (!storedSession) {
        setStatus('signed_out');
        return;
      }

      setSession(storedSession);
      setStatus('signed_in');

      if (!(await canReachInternet())) return;
      try {
        const result = await silentlyValidateGoogleSession();
        if (!mounted || operationId.current !== currentOperation) return;
        if (result.kind === 'no_saved_credential') {
          await deleteAuthSession();
          clearSensitiveCacheSafely();
          if (!mounted) return;
          setSession(null);
          setStatus('reauth_required');
          return;
        }
        if (result.session.user.id !== storedSession.user.id) {
          await deleteAuthSession();
          clearSensitiveCacheSafely();
          if (!mounted) return;
          setSession(null);
          setStatus('reauth_required');
          return;
        }
        await writeAuthSession(result.session);
        if (!mounted) return;
        setSession(result.session);
      } catch (validationError) {
        if (
          validationError instanceof GoogleAuthError &&
          validationError.authCode === 'REAUTH_REQUIRED'
        ) {
          await deleteAuthSession();
          clearSensitiveCacheSafely();
          if (!mounted) return;
          setSession(null);
          setStatus('reauth_required');
        }
      }
    }

    void restore().catch(async (restoreError) => {
      await deleteAuthSession().catch(() => undefined);
      if (!mounted) return;
      setSession(null);
      setError(toAuthErrorState(restoreError));
      setStatus('signed_out');
    });

    return () => {
      mounted = false;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signInWithGoogle = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    const currentOperation = ++operationId.current;
    try {
      if (!(await canReachInternet())) {
        setError({
          code: 'OFFLINE',
          message: 'Internet diperlukan untuk login Google pertama kali.',
        });
        return;
      }
      const result = await performGoogleSignIn();
      if (result.kind === 'cancelled') return;
      await writeAuthSession(result.session);
      if (operationId.current !== currentOperation) return;
      setSession(result.session);
      setStatus('signed_in');
    } catch (signInError) {
      if (operationId.current === currentOperation) {
        setError(toAuthErrorState(signInError));
      }
    } finally {
      if (operationId.current === currentOperation) setIsBusy(false);
    }
  }, [isBusy]);

  const signOut = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    ++operationId.current;
    await deleteAuthSession().catch(() => undefined);
    setSession(null);
    setStatus('signed_out');
    clearSensitiveCacheSafely();
    await signOutFromGoogle().catch(() => undefined);
    setIsBusy(false);
  }, [isBusy]);

  const value = useMemo<AuthContextValue>(
    () => ({
      clearError,
      error,
      isBusy,
      signInWithGoogle,
      signOut,
      status,
      user: session?.user ?? null,
    }),
    [
      clearError,
      error,
      isBusy,
      session?.user,
      signInWithGoogle,
      signOut,
      status,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider.');
  return value;
}
