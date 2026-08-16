export type ColorPalette = {
  readonly background: string;
  readonly surface: string;
  readonly surfaceSecondary: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly border: string;
  readonly primary: string;
  readonly primaryLight: string;
  readonly positive: string;
  readonly destructive: string;
  readonly warning: string;
  readonly card: string;
  readonly divider: string;
};

export const lightColors: ColorPalette = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  positive: '#15803D',
  destructive: '#B42318',
  warning: '#B54708',
  card: '#FFFFFF',
  divider: '#E2E8F0',
};

export const darkColors: ColorPalette = {
  background: '#0B0F19',
  surface: '#1E293B',
  surfaceSecondary: '#334155',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  border: '#334155',
  primary: '#3B82F6',
  primaryLight: '#1E3A8A',
  positive: '#22C55E',
  destructive: '#EF4444',
  warning: '#F59E0B',
  card: '#1E293B',
  divider: '#334155',
};

export const colors: ColorPalette = lightColors;
