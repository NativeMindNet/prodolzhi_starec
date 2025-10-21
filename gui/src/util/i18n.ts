/**
 * Internationalization utility for "Сделай, Старец!"
 * Supports Russian (ru) and Thai (th) languages only
 */

import ruTranslations from '../../../l10n/app_ru.json';
import thTranslations from '../../../l10n/app_th.json';

export type Language = 'ru' | 'th';

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  symbol: string;
  icon: string;
}

export const SUPPORTED_LANGUAGES: Record<Language, LanguageInfo> = {
  ru: {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
    symbol: '🦅',
    icon: 'Российский Двухглавый Орёл'
  },
  th: {
    code: 'th',
    name: 'Thai',
    nativeName: 'ไทย',
    flag: '🇹🇭',
    symbol: 'ครุฑ',
    icon: 'ครุฑไทย (Thai Garuda)'
  }
};

type TranslationObject = { [key: string]: any };

const translations: Record<Language, TranslationObject> = {
  ru: ruTranslations,
  th: thTranslations
};

let currentLanguage: Language = 'ru'; // Default to Russian

/**
 * Get the current language
 */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * Set the current language
 */
export function setLanguage(lang: Language): void {
  if (lang in SUPPORTED_LANGUAGES) {
    currentLanguage = lang;
    localStorage.setItem('sdelay_starets_language', lang);
  }
}

/**
 * Load language from localStorage or browser settings
 */
export function initLanguage(): Language {
  const saved = localStorage.getItem('sdelay_starets_language');
  if (saved && (saved === 'ru' || saved === 'th')) {
    currentLanguage = saved;
    return saved;
  }
  
  // Default to Russian
  currentLanguage = 'ru';
  return 'ru';
}

/**
 * Get translation by key path (e.g., 'app.name', 'features.chat.title')
 */
export function t(keyPath: string, lang?: Language): string {
  const targetLang = lang || currentLanguage;
  const keys = keyPath.split('.');
  let value: any = translations[targetLang];
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      // Fallback to Russian if key not found
      if (targetLang !== 'ru') {
        return t(keyPath, 'ru');
      }
      console.warn(`Translation key not found: ${keyPath}`);
      return keyPath;
    }
  }
  
  return typeof value === 'string' ? value : keyPath;
}

/**
 * Get all translations for current language
 */
export function getAllTranslations(lang?: Language): TranslationObject {
  return translations[lang || currentLanguage];
}

/**
 * Toggle between Russian and Thai
 */
export function toggleLanguage(): Language {
  const newLang: Language = currentLanguage === 'ru' ? 'th' : 'ru';
  setLanguage(newLang);
  return newLang;
}

/**
 * Get language info for display
 */
export function getLanguageInfo(lang?: Language): LanguageInfo {
  return SUPPORTED_LANGUAGES[lang || currentLanguage];
}

// Initialize language on module load
initLanguage();


