import {
  GoogleSignin,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
  type User as GoogleUser,
} from '@react-native-google-signin/google-signin';

import type {
  AuthErrorCode,
  AuthErrorState,
  AuthSession,
  AuthUser,
} from '@/features/auth/auth-types';

const CLIENT_ID_PATTERN =
  /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;
export const GOOGLE_DRIVE_APPDATA_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata';
let configuredClientId: string | null = null;

export class GoogleAuthError extends Error {
  constructor(
    readonly authCode: AuthErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

function getWebClientId() {
  const value = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
  if (!CLIENT_ID_PATTERN.test(value)) {
    throw new GoogleAuthError(
      'CONFIGURATION',
      'Google Sign-In belum dikonfigurasi dengan benar.',
    );
  }
  return value;
}

export function configureGoogleAuth() {
  const webClientId = getWebClientId();
  if (configuredClientId === webClientId) return;
  GoogleSignin.configure({
    offlineAccess: false,
    scopes: [GOOGLE_DRIVE_APPDATA_SCOPE],
    webClientId,
  });
  configuredClientId = webClientId;
}

function toAuthUser(value: GoogleUser): AuthUser {
  return {
    email: value.user.email,
    id: value.user.id,
    name: value.user.name,
    photoUrl: value.user.photo,
  };
}

function toSession(value: GoogleUser): AuthSession {
  if (!value.idToken) {
    throw new GoogleAuthError(
      'CONFIGURATION',
      'Google tidak mengembalikan ID token. Periksa Web Client ID.',
    );
  }
  return {
    lastVerifiedAt: Date.now(),
    user: toAuthUser(value),
    version: 1,
  };
}

export type InteractiveSignInResult =
  | Readonly<{ kind: 'cancelled' }>
  | Readonly<{ kind: 'success'; session: AuthSession }>;

export async function signInWithGoogle(): Promise<InteractiveSignInResult> {
  configureGoogleAuth();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { kind: 'cancelled' };
    return { kind: 'success', session: toSession(response.data) };
  } catch (error) {
    throw normalizeGoogleAuthError(error);
  }
}

export type SilentSignInResult =
  | Readonly<{ kind: 'no_saved_credential' }>
  | Readonly<{ kind: 'success'; session: AuthSession }>;

export async function silentlyValidateGoogleSession(): Promise<SilentSignInResult> {
  configureGoogleAuth();
  try {
    const response = await GoogleSignin.signInSilently();
    if (isNoSavedCredentialFoundResponse(response)) {
      return { kind: 'no_saved_credential' };
    }
    return { kind: 'success', session: toSession(response.data) };
  } catch (error) {
    throw normalizeGoogleAuthError(error);
  }
}

export async function signOutFromGoogle() {
  configureGoogleAuth();
  await GoogleSignin.signOut();
}

export type GoogleDriveAuthorizationResult =
  | Readonly<{ kind: 'cancelled' }>
  | Readonly<{ kind: 'granted' }>
  | Readonly<{ kind: 'signed_out' }>;

export async function requestGoogleDriveAccess(): Promise<GoogleDriveAuthorizationResult> {
  configureGoogleAuth();
  try {
    const response = await GoogleSignin.addScopes({
      scopes: [GOOGLE_DRIVE_APPDATA_SCOPE],
    });
    if (response === null) return { kind: 'signed_out' };
    return isSuccessResponse(response)
      ? { kind: 'granted' }
      : { kind: 'cancelled' };
  } catch (error) {
    throw normalizeGoogleAuthError(error);
  }
}

export async function getGoogleDriveAccessToken() {
  configureGoogleAuth();
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    if (!accessToken) {
      throw new GoogleAuthError(
        'REAUTH_REQUIRED',
        'Izin Google Drive perlu diverifikasi kembali.',
      );
    }
    return accessToken;
  } catch (error) {
    throw normalizeGoogleAuthError(error);
  }
}

export async function clearGoogleDriveAccessToken(accessToken: string) {
  configureGoogleAuth();
  await GoogleSignin.clearCachedAccessToken(accessToken);
}

export function normalizeGoogleAuthError(error: unknown): GoogleAuthError {
  if (error instanceof GoogleAuthError) return error;
  if (isErrorWithCode(error)) {
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return new GoogleAuthError(
        'PLAY_SERVICES',
        'Google Play Services tidak tersedia atau perlu diperbarui.',
      );
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      return new GoogleAuthError(
        'IN_PROGRESS',
        'Proses login Google sedang berjalan.',
      );
    }
    if (error.code === statusCodes.SIGN_IN_REQUIRED) {
      return new GoogleAuthError(
        'REAUTH_REQUIRED',
        'Sesi Google perlu diverifikasi kembali.',
      );
    }
  }
  return new GoogleAuthError(
    'UNKNOWN',
    error instanceof Error ? error.message : 'Login Google gagal.',
  );
}

export function toAuthErrorState(error: unknown): AuthErrorState {
  const normalized = normalizeGoogleAuthError(error);
  return { code: normalized.authCode, message: normalized.message };
}
