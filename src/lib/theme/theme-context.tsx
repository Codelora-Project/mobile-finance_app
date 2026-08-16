import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ColorPalette } from '@/theme/colors';

export type ThemeSetting = 'light' | 'dark' | 'system';
export type ActiveTheme = 'light' | 'dark';

type ThemeContextValue = Readonly<{
  colors: ColorPalette;
  isDark: boolean;
  setThemeSetting: (theme: ThemeSetting) => void;
  theme: ActiveTheme;
  themeSetting: ThemeSetting;
}>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme?: ThemeSetting;
  onThemeChange?: (theme: ThemeSetting) => void | Promise<void>;
};

export function ThemeProvider({
  children,
  initialTheme = 'system',
  onThemeChange,
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeSetting, setThemeSettingState] =
    useState<ThemeSetting>(initialTheme);
  const [prevInitial, setPrevInitial] = useState<ThemeSetting>(initialTheme);

  if (initialTheme !== prevInitial) {
    setPrevInitial(initialTheme);
    setThemeSettingState(initialTheme);
  }

  const setThemeSetting = useCallback(
    (nextSetting: ThemeSetting) => {
      setThemeSettingState(nextSetting);
      void onThemeChange?.(nextSetting);
    },
    [onThemeChange],
  );

  const activeTheme: ActiveTheme = useMemo(() => {
    if (themeSetting === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeSetting;
  }, [systemColorScheme, themeSetting]);

  const activeColors = activeTheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: activeColors,
      isDark: activeTheme === 'dark',
      setThemeSetting,
      theme: activeTheme,
      themeSetting,
    }),
    [activeColors, activeTheme, setThemeSetting, themeSetting],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      colors: lightColors,
      isDark: false,
      setThemeSetting: () => {},
      theme: 'light' as ActiveTheme,
      themeSetting: 'system' as ThemeSetting,
    };
  }
  return context;
}
