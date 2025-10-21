/**
 * Language Switcher Component
 * Переключатель языка между Русским (🦅) и Тайским (ครุฑ)
 */

import React from 'react';
import { useLanguage } from '../context/Language';
import { SUPPORTED_LANGUAGES } from '../util/i18n';

export function LanguageSwitcher() {
  const { language, toggleLanguage, t } = useLanguage();
  const currentInfo = SUPPORTED_LANGUAGES[language];
  const otherLang = language === 'ru' ? 'th' : 'ru';
  const otherInfo = SUPPORTED_LANGUAGES[otherLang];

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
      title={`${t('language.title')}: ${currentInfo.nativeName} → ${otherInfo.nativeName}`}
      aria-label={`Switch language to ${otherInfo.nativeName}`}
    >
      {/* Current language symbol */}
      <span 
        className="text-3xl transition-transform hover:scale-110" 
        role="img" 
        aria-label={currentInfo.icon}
      >
        {currentInfo.symbol}
      </span>
      
      {/* Language name */}
      <span className="text-sm font-medium hidden md:inline">
        {currentInfo.nativeName}
      </span>
      
      {/* Arrow indicator */}
      <span className="text-xs opacity-50 hidden md:inline">
        ⇄
      </span>
      
      {/* Next language symbol (faded) */}
      <span 
        className="text-xl opacity-40 hidden md:inline" 
        role="img" 
        aria-label={otherInfo.icon}
      >
        {otherInfo.symbol}
      </span>
    </button>
  );
}

export function CompactLanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage();
  const currentInfo = SUPPORTED_LANGUAGES[language];
  const otherLang = language === 'ru' ? 'th' : 'ru';
  const otherInfo = SUPPORTED_LANGUAGES[otherLang];

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all duration-200"
      title={`${currentInfo.nativeName} → ${otherInfo.nativeName}`}
      aria-label={`Switch to ${otherInfo.nativeName}`}
    >
      <span 
        className="text-2xl transition-transform hover:scale-110" 
        role="img" 
        aria-label={currentInfo.icon}
      >
        {currentInfo.symbol}
      </span>
    </button>
  );
}

export function LanguageFlag() {
  const { language } = useLanguage();
  const info = SUPPORTED_LANGUAGES[language];
  
  return (
    <span 
      className="text-2xl" 
      role="img" 
      aria-label={`${info.nativeName} flag`}
    >
      {info.flag}
    </span>
  );
}


