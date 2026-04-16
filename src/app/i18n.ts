import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '@/public/locales/en/common.json';
import zhCommon from '@/public/locales/zh/common.json';
import {
  fallbackLanguage,
  getInitialLanguage,
  supportedLanguages,
} from '@/lib/language';

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
    zh: { common: zhCommon },
  },
  lng: getInitialLanguage(),
  fallbackLng: fallbackLanguage,
  supportedLngs: [...supportedLanguages],
  nonExplicitSupportedLngs: true,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
