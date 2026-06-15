import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from './locales/id.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('language') || 'en';

i18n.use(initReactI18next).init({
  lng: savedLang,
  fallbackLng: 'en',
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
});

export default i18n;