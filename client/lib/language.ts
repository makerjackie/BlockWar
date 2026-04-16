export const supportedLanguages = ['en', 'zh'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export const fallbackLanguage: SupportedLanguage = 'en';
export const localeStorageKey = 'locale';

export function resolveSupportedLanguage(
  language: string | null | undefined
): SupportedLanguage | null {
  if (!language) {
    return null;
  }

  const normalizedLanguage = language.trim().replace(/_/g, '-').toLowerCase();

  if (normalizedLanguage === 'zh' || normalizedLanguage.startsWith('zh-')) {
    return 'zh';
  }

  if (normalizedLanguage === 'en' || normalizedLanguage.startsWith('en-')) {
    return 'en';
  }

  return null;
}

export function resolveLanguageFromCandidates(
  candidates: readonly (string | null | undefined)[]
): SupportedLanguage | null {
  for (const candidate of candidates) {
    const language = resolveSupportedLanguage(candidate);

    if (language) {
      return language;
    }
  }

  return null;
}

export function getBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return fallbackLanguage;
  }

  const browserLanguages =
    typeof navigator.languages !== 'undefined'
      ? Array.from(navigator.languages)
      : [];

  return (
    resolveLanguageFromCandidates([...browserLanguages, navigator.language]) ??
    fallbackLanguage
  );
}

export function getSavedLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return resolveSupportedLanguage(window.localStorage.getItem(localeStorageKey));
}

export function getInitialLanguage(): SupportedLanguage {
  return getSavedLanguage() ?? getBrowserLanguage();
}
