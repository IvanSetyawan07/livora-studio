import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import id from './locales/id.json';
import en from './locales/en.json';

const SUPPORTED = ['id', 'en'];

// Urutan: pilihan tersimpan → bahasa browser → English.
const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
const savedLang =
  localStorage.getItem('language') ||
  (SUPPORTED.includes(browserLang) ? browserLang : 'en');

i18n.use(initReactI18next).init({
  lng: savedLang,
  fallbackLng: 'en',
  supportedLngs: SUPPORTED,
  resources: {
    id: { translation: id },
    en: { translation: en },
  },
  interpolation: { escapeValue: false },
});

const syncHtmlLang = (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
};

syncHtmlLang(savedLang);
i18n.on('languageChanged', (lng) => {
  syncHtmlLang(lng);
  localStorage.setItem('language', lng);
});

export default i18n;
