export type AuthUser = Readonly<{
  email: string;
  id: string;
  name: string | null;
  photoUrl: string | null;
}>;

export type AuthSession = Readonly<{
  lastVerifiedAt: number;
  user: AuthUser;
  version: 1;
}>;

export type AuthStatus =
  'restoring' | 'signed_out' | 'signed_in' | 'reauth_required';

export type AuthErrorCode =
  | 'CONFIGURATION'
  | 'IN_PROGRESS'
  | 'OFFLINE'
  | 'PLAY_SERVICES'
  | 'REAUTH_REQUIRED'
  | 'UNKNOWN';

export type AuthErrorState = Readonly<{
  code: AuthErrorCode;
  message: string;
}>;

export type AuthContextValue = Readonly<{
  clearError(): void;
  error: AuthErrorState | null;
  isBusy: boolean;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  status: AuthStatus;
  user: AuthUser | null;
}>;

export type AccountScope = Readonly<{
  accountId: string;
  databaseName: string;
  receiptDirectory: string;
}>;
