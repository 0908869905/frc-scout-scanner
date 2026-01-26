/**
 * FRC Scout Scanner - i18n Context
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { zhTW, type Translations } from './locales/zh-TW';
import { en } from './locales/en';

export type Locale = 'zh-TW' | 'en';

interface I18nContextType {
  locale: Locale;
  t: Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const locales: Record<Locale, Translations> = {
  'zh-TW': zhTW,
  en: en,
};

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'frc-scanner-locale';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh-TW' || saved === 'en') {
        return saved;
      }
    } catch {
      // localStorage may not be available
    }
    return 'zh-TW'; // Default to Traditional Chinese
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // localStorage may not be available
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'zh-TW' ? 'en' : 'zh-TW');
  }, [locale, setLocale]);

  return (
    <I18nContext.Provider value={{ locale, t: locales[locale], setLocale, toggleLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
