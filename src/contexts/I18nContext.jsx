import { createContext, useContext, useState, useEffect } from 'react';
import { translate } from '../lib/i18n';

const I18nContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('ayzal-lang') || 'en');

  useEffect(() => {
    document.documentElement.lang = lang === 'gu' ? 'gu' : lang === 'hi' ? 'hi' : 'en';
  }, [lang]);

  const setLang = (code) => {
    setLangState(code);
    localStorage.setItem('ayzal-lang', code);
  };

  const t = (key) => translate(lang, key);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
