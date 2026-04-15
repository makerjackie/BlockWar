export { useTranslation } from 'react-i18next';

export function appWithTranslation<T>(Component: T): T {
  return Component;
}
