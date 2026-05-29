// src/i18n/LanguageContext.jsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { ko, en } from './strings';

const I18nContext = createContext(null);

const dictionaries = { ko, en };

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState('ko'); // 기본 언어: 한국어

  const value = useMemo(() => {
    const dict = dictionaries[language] || ko;

    const t = (path) => {
      // "login.title" -> dict.login.title
      const parts = path.split('.');
      let current = dict;
      for (const p of parts) {
        if (!current || typeof current !== 'object') return path;
        current = current[p];
      }
      return current ?? path;
    };

    return { language, setLanguage, t };
  }, [language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}