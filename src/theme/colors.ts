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
  readonly textPrimary: string;
  readonly textSecondary: string;
  /** Muted/passive icons, hint text, placeholder */
  readonly textMuted: string;
  readonly border: string;
  readonly primary: string;
  readonly primaryLight: string;
  /** Content rendered on top of the primary/accent color. */
  readonly onPrimary: string;
  /** Neutral shadow color; use opacity at the component level. */
  readonly shadow: string;
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
};

export function getLightPalette(brandTheme: BrandTheme = 'blue'): ColorPalette {
  const brand = BRAND_PRESETS[brandTheme] ?? BRAND_PRESETS.blue;
  return {
    background: '#F8FAFC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    destructive: '#B42318',
    divider: '#E2E8F0',
    expenseBackground: '#FEE2E2',
    incomeBackground: '#DCFCE7',
    positive: '#15803D',
    onPrimary: '#FFFFFF',
    primary: brand.primary,
    primaryLight: brand.primaryLight,
    surface: '#FFFFFF',
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
    background: '#09090B',
    card: '#18181B',
    border: '#303034',
    destructive: '#FB7185',
    divider: '#303034',
    expenseBackground: '#3A171B',
    incomeBackground: '#12351F',
    positive: '#4ADE80',
    onPrimary: '#FFFFFF',
    primary: brand.primaryDark,
    primaryLight: brand.primaryLightDark,
    surface: '#18181B',
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
