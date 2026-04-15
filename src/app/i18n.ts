import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '@/public/locales/en/common.json';
import zhCommon from '@/public/locales/zh/common.json';

const savedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('locale') : null;
const browserLanguage =
  typeof navigator !== 'undefined' && navigator.language.startsWith('zh')
    ? 'zh'
    : 'en';

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    zh: { common: zhCommon },
  },
  lng: savedLanguage ?? browserLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
