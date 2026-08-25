import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  getDarkPalette,
  getLightPalette,
  lightColors,
  type BrandTheme,
  type ColorPalette,
} from '@/theme/colors';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

type ThemeContextValue = Readonly<{
  brandTheme: BrandTheme;
  colors: ColorPalette;
  isDark: boolean;
  setBrandTheme: (brandTheme: BrandTheme) => Promise<void>;
  setThemeSetting: (theme: ThemeSetting) => Promise<void>;
  theme: ActiveTheme;
  themeSetting: ThemeSetting;
}>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialBrandTheme?: BrandTheme;
  initialTheme?: ThemeSetting;
  onBrandThemeChange?: (brandTheme: BrandTheme) => void | Promise<void>;
  onThemeChange?: (theme: ThemeSetting) => void | Promise<void>;
};

export function ThemeProvider({
  children,
  initialBrandTheme = 'blue',
  initialTheme = 'system',
  onBrandThemeChange,
  onThemeChange,
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeSetting, setThemeSettingState] =
    useState<ThemeSetting>(initialTheme);
  const [brandTheme, setBrandThemeState] =
    useState<BrandTheme>(initialBrandTheme);
  const [prevInitial, setPrevInitial] = useState<ThemeSetting>(initialTheme);
  const [prevInitialBrand, setPrevInitialBrand] =
    useState<BrandTheme>(initialBrandTheme);

  if (initialTheme !== prevInitial) {
    setPrevInitial(initialTheme);
    setThemeSettingState(initialTheme);
  }

  if (initialBrandTheme !== prevInitialBrand) {
    setPrevInitialBrand(initialBrandTheme);
    setBrandThemeState(initialBrandTheme);
  }

  const setThemeSetting = useCallback(
    async (nextSetting: ThemeSetting) => {
      if (onThemeChange) {
        await onThemeChange(nextSetting);
      }
      setThemeSettingState(nextSetting);
    },
    [onThemeChange],
  );

  const setBrandTheme = useCallback(
    async (nextBrandTheme: BrandTheme) => {
      if (onBrandThemeChange) {
        await onBrandThemeChange(nextBrandTheme);
      }
      setBrandThemeState(nextBrandTheme);
    },
    [onBrandThemeChange],
  );

  const activeTheme: ActiveTheme = useMemo(() => {
    if (themeSetting === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeSetting;
  }, [systemColorScheme, themeSetting]);

  const activeColors = useMemo(() => {
    return activeTheme === 'dark'
      ? getDarkPalette(brandTheme)
      : getLightPalette(brandTheme);
  }, [activeTheme, brandTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      brandTheme,
      colors: activeColors,
      isDark: activeTheme === 'dark',
      setBrandTheme,
      setThemeSetting,
      theme: activeTheme,
      themeSetting,
    }),
    [
      activeColors,
      activeTheme,
      brandTheme,
      setBrandTheme,
      setThemeSetting,
      themeSetting,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      brandTheme: 'blue' as BrandTheme,
      colors: lightColors,
      isDark: false,
      setBrandTheme: async () => {},
      setThemeSetting: async () => {},
      theme: 'light' as ActiveTheme,
      themeSetting: 'system' as ThemeSetting,
    };
  }
  return context;
}
