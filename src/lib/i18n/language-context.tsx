import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  translations,
  type Language,
  type TranslationSchema,
} from '@/lib/i18n/translations';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: TranslationSchema;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLanguage = 'id',
  onLanguageChange,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
  onLanguageChange?: (language: Language) => Promise<void> | void;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [prevInitial, setPrevInitial] = useState<Language>(initialLanguage);

  if (initialLanguage !== prevInitial) {
    setPrevInitial(initialLanguage);
    setLanguageState(initialLanguage);
  }

  const setLanguage = useCallback(
    async (nextLanguage: Language) => {
      setLanguageState(nextLanguage);
      if (onLanguageChange) {
        await onLanguageChange(nextLanguage);
      }
    },
    [onLanguageChange],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'id',
      setLanguage: async () => {},
      t: translations.id,
    };
  }
  return context;
}
