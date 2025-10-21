/**
 * Language Context Provider for "Сделай, Старец!"
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getCurrentLanguage, setLanguage as setI18nLanguage, t, getLanguageInfo, LanguageInfo } from '../util/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  languageInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());

  const setLanguage = (lang: Language) => {
    setI18nLanguage(lang);
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    const newLang: Language = language === 'ru' ? 'th' : 'ru';
    setLanguage(newLang);
  };

  const translate = (key: string) => t(key, language);

  const languageInfo = getLanguageInfo(language);

  useEffect(() => {
    // Update document language attribute
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t: translate,
        languageInfo
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export function LanguageSwitcher() {
  const { language, toggleLanguage, languageInfo } = useLanguage();
  const otherLang = language === 'ru' ? 'th' : 'ru';
  const otherInfo = getLanguageInfo(otherLang);

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-opacity-10 bg-gray-200 hover:bg-opacity-20 transition-all"
      title={`${t('language.title')}: ${languageInfo.nativeName} → ${otherInfo.nativeName}`}
      aria-label={`Switch to ${otherInfo.nativeName}`}
    >
      <span className="text-2xl" role="img" aria-label={languageInfo.icon}>
        {languageInfo.symbol}
      </span>
      <span className="text-sm font-medium">{languageInfo.nativeName}</span>
    </button>
  );
}

// Export type for use in other components
export type { Language, LanguageInfo };


