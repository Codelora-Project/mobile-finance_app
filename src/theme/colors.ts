export type BrandTheme =
  'blue' | 'emerald' | 'indigo' | 'violet' | 'amber' | 'slate';

export type BrandPreset = {
  id: BrandTheme;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryLightDark: string;
};

export const fixedSemanticColors = {
  contentOnStrong: '#FFFFFF',
  googleBrand: '#4285F4',
  modalBackdrop: 'rgba(0, 0, 0, 0.65)',
  neutralHairline: 'rgba(150, 150, 150, 0.15)',
  rippleOnStrong: 'rgba(255, 255, 255, 0.16)',
  shadow: '#000000',
} as const;

export const goalColorOptions = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#EF4444',
  '#14B8A6',
] as const;

export const walletColorOptions = [
  '#2563EB',
  '#10B981',
  '#8B5CF6',
  '#00AED6',
  '#F59E0B',
  '#EF4444',
  '#4F46E5',
  '#64748B',
] as const;

export const defaultGoalColor = goalColorOptions[0];
export const defaultWalletColor = walletColorOptions[0];

export const BRAND_PRESETS: Record<BrandTheme, BrandPreset> = {
  blue: {
    id: 'blue',
    name: 'Modern Blue',
    primary: '#2563EB',
    primaryDark: '#3B82F6',
    primaryLight: '#EFF6FF',
    primaryLightDark: '#1E3A8A',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Green',
    primary: '#059669',
    primaryDark: '#10B981',
    primaryLight: '#ECFDF5',
    primaryLightDark: '#064E3B',
  },
  indigo: {
    id: 'indigo',
    name: 'Midnight Indigo',
    primary: '#4F46E5',
    primaryDark: '#6366F1',
    primaryLight: '#EEF2FF',
    primaryLightDark: '#312E81',
  },
  violet: {
    id: 'violet',
    name: 'Royal Violet',
    primary: '#7C3AED',
    primaryDark: '#8B5CF6',
    primaryLight: '#F5F3FF',
    primaryLightDark: '#4C1D95',
  },
  amber: {
    id: 'amber',
    name: 'Sunset Amber',
    primary: '#D97706',
    primaryDark: '#F59E0B',
    primaryLight: '#FFFBEB',
    primaryLightDark: '#78350F',
  },
  slate: {
    id: 'slate',
    name: 'Monochrome Slate',
    primary: '#0F172A',
    primaryDark: '#94A3B8',
    primaryLight: '#F1F5F9',
    primaryLightDark: '#334155',
  },
};

export type ColorPalette = {
  readonly background: string;
  readonly surface: string;
  readonly surfaceSecondary: string;
  /** Low-emphasis page/control fill, distinct from cards. */
  readonly surfaceMuted: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  /** Muted/passive icons, hint text, placeholder */
  readonly textMuted: string;
  readonly border: string;
  /** Higher-contrast outline for inactive controls and tracks. */
  readonly borderStrong: string;
  readonly primary: string;
  readonly primaryLight: string;
  /** Content rendered on top of the primary/accent color. */
  readonly onPrimary: string;
  /** Neutral shadow color; use opacity at the component level. */
  readonly shadow: string;
  readonly overlayBackdrop: string;
  readonly pressedOverlay: string;
  readonly subtleOverlay: string;
  readonly primaryOverlay: string;
  readonly primaryOverlayStrong: string;
  readonly primaryOverlaySubtle: string;
  readonly primaryBorder: string;
  readonly positiveOverlay: string;
  readonly positiveOverlayStrong: string;
  readonly positiveBorder: string;
  readonly destructiveOverlay: string;
  readonly destructiveOverlayStrong: string;
  readonly destructiveOverlaySubtle: string;
  readonly destructiveBorder: string;
  readonly warningOverlay: string;
  readonly warningBorder: string;
  readonly raisedOverlay: string;
  readonly hairlineOverlay: string;
  readonly positive: string;
  readonly destructive: string;
  readonly warning: string;
  readonly card: string;
  readonly divider: string;
  /** Background for income / positive badges (pastel green) */
  readonly incomeBackground: string;
  /** Background for expense / error badges (pastel red) */
  readonly expenseBackground: string;
  /** Background for warning / caution badges (pastel amber) */
  readonly warningBackground: string;
  readonly accentOrange: string;
  readonly accentOrangeBackground: string;
  readonly accentPurple: string;
  readonly accentPurpleBackground: string;
  readonly accentPurpleBorder: string;
  readonly accentIndigo: string;
  readonly accentIndigoBackground: string;
  readonly accentIndigoBorder: string;
  readonly accentSky: string;
  readonly accentCyan: string;
  readonly accentYellow: string;
  readonly accentYellowBackground: string;
};

export function getLightPalette(brandTheme: BrandTheme = 'blue'): ColorPalette {
  const brand = BRAND_PRESETS[brandTheme] ?? BRAND_PRESETS.blue;
  return {
    accentCyan: '#00AED6',
    accentIndigo: '#4F46E5',
    accentIndigoBackground: '#EEF2FF',
    accentIndigoBorder: '#C7D2FE',
    accentOrange: '#EA580C',
    accentOrangeBackground: '#FFEDD5',
    accentPurple: '#7C3AED',
    accentPurpleBackground: '#EDE9FE',
    accentPurpleBorder: '#DDD6FE',
    accentSky: '#0284C7',
    accentYellow: '#CA8A04',
    accentYellowBackground: '#FEF9C3',
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    destructive: '#B42318',
    divider: '#E2E8F0',
    expenseBackground: '#FEE2E2',
    incomeBackground: '#DCFCE7',
    positive: '#15803D',
    onPrimary: '#FFFFFF',
    overlayBackdrop: 'rgba(15, 23, 42, 0.65)',
    pressedOverlay: 'rgba(0, 0, 0, 0.05)',
    primary: brand.primary,
    primaryLight: brand.primaryLight,
    primaryOverlay: 'rgba(37, 99, 235, 0.15)',
    primaryOverlayStrong: 'rgba(37, 99, 235, 0.3)',
    primaryOverlaySubtle: 'rgba(37, 99, 235, 0.06)',
    primaryBorder: '#BFDBFE',
    positiveOverlay: 'rgba(22, 163, 74, 0.15)',
    positiveOverlayStrong: 'rgba(22, 163, 74, 0.3)',
    positiveBorder: '#86EFAC',
    destructiveOverlay: 'rgba(180, 35, 24, 0.12)',
    destructiveOverlayStrong: 'rgba(180, 35, 24, 0.3)',
    destructiveOverlaySubtle: 'rgba(180, 35, 24, 0.06)',
    destructiveBorder: '#FCA5A5',
    warningOverlay: 'rgba(181, 71, 8, 0.15)',
    warningBorder: '#FDE68A',
    raisedOverlay: 'rgba(0, 0, 0, 0.04)',
    hairlineOverlay: 'rgba(15, 23, 42, 0.025)',
    subtleOverlay: 'rgba(0, 0, 0, 0.04)',
    surface: '#FFFFFF',
    surfaceMuted: '#F8FAFC',
    surfaceSecondary: '#F1F5F9',
    shadow: '#000000',
    textMuted: '#94A3B8',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    warning: '#B54708',
    warningBackground: '#FEF3C7',
  };
}

export function getDarkPalette(brandTheme: BrandTheme = 'blue'): ColorPalette {
  const brand = BRAND_PRESETS[brandTheme] ?? BRAND_PRESETS.blue;
  return {
    accentCyan: '#00AED6',
    accentIndigo: '#818CF8',
    accentIndigoBackground: 'rgba(99, 102, 241, 0.15)',
    accentIndigoBorder: 'rgba(99, 102, 241, 0.3)',
    accentOrange: '#FB923C',
    accentOrangeBackground: '#3A2416',
    accentPurple: '#C084FC',
    accentPurpleBackground: 'rgba(139, 92, 246, 0.15)',
    accentPurpleBorder: 'rgba(139, 92, 246, 0.3)',
    accentSky: '#60A5FA',
    accentYellow: '#FACC15',
    accentYellowBackground: 'rgba(234, 179, 8, 0.2)',
    background: '#09090B',
    card: '#18181B',
    border: '#303034',
    borderStrong: '#475569',
    destructive: '#FB7185',
    divider: '#303034',
    expenseBackground: '#3A171B',
    incomeBackground: '#12351F',
    positive: '#4ADE80',
    onPrimary: '#FFFFFF',
    overlayBackdrop: 'rgba(0, 0, 0, 0.75)',
    pressedOverlay: 'rgba(255, 255, 255, 0.06)',
    primary: brand.primaryDark,
    primaryLight: brand.primaryLightDark,
    primaryOverlay: 'rgba(59, 130, 246, 0.15)',
    primaryOverlayStrong: 'rgba(59, 130, 246, 0.3)',
    primaryOverlaySubtle: 'rgba(59, 130, 246, 0.08)',
    primaryBorder: 'rgba(59, 130, 246, 0.3)',
    positiveOverlay: 'rgba(74, 222, 128, 0.16)',
    positiveOverlayStrong: 'rgba(74, 222, 128, 0.3)',
    positiveBorder: 'rgba(74, 222, 128, 0.3)',
    destructiveOverlay: 'rgba(251, 113, 133, 0.16)',
    destructiveOverlayStrong: 'rgba(251, 113, 133, 0.3)',
    destructiveOverlaySubtle: 'rgba(251, 113, 133, 0.06)',
    destructiveBorder: 'rgba(251, 113, 133, 0.3)',
    warningOverlay: 'rgba(245, 158, 11, 0.15)',
    warningBorder: '#78350F',
    raisedOverlay: 'rgba(255, 255, 255, 0.08)',
    hairlineOverlay: 'rgba(255, 255, 255, 0.025)',
    subtleOverlay: 'rgba(255, 255, 255, 0.05)',
    surface: '#18181B',
    surfaceMuted: '#27272A',
    surfaceSecondary: '#27272A',
    shadow: '#000000',
    textMuted: '#71717A',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    warning: '#FBBF24',
    warningBackground: '#3A2A0F',
  };
}

export const lightColors: ColorPalette = getLightPalette('blue');
export const darkColors: ColorPalette = getDarkPalette('blue');
export const colors: ColorPalette = lightColors;
