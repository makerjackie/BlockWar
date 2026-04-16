import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  fallbackLanguage,
  localeStorageKey,
  resolveSupportedLanguage,
  supportedLanguages,
} from '@/lib/language';
import i18n from '../app/i18n';

type RouteHandler = (url: string) => void;

const listeners = new Map<string, Set<RouteHandler>>();

function emit(event: string, url: string) {
  const handlers = listeners.get(event);
  if (!handlers) return;
  for (const handler of handlers) {
    handler(url);
  }
}

function buildQuery(
  pathnameParams: Readonly<Record<string, string | undefined>>,
  search: string
) {
  const searchParams = new URLSearchParams(search);
  const query: Record<string, string> = {};

  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }

  for (const [key, value] of Object.entries(pathnameParams)) {
    if (value) {
      query[key] = value;
    }
  }

  return query;
}

export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const query = useMemo(
    () => buildQuery(params, location.search),
    [location.search, params]
  );

  const push = useCallback(
    async (
      url: string,
      _as?: unknown,
      options?: {
        locale?: string;
      }
    ) => {
      if (options?.locale) {
        const nextLocale = resolveSupportedLanguage(options.locale);

        if (nextLocale) {
          await i18n.changeLanguage(nextLocale);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(localeStorageKey, nextLocale);
          }
        }
      }
      navigate(url);
      emit('routeChangeComplete', url);
      return true;
    },
    [navigate]
  );

  const locale =
    resolveSupportedLanguage(i18n.resolvedLanguage) ??
    resolveSupportedLanguage(i18n.language) ??
    fallbackLanguage;

  return {
    query,
    push,
    asPath: `${location.pathname}${location.search}`,
    pathname: location.pathname,
    locale,
    locales: [...supportedLanguages],
  };
}

export const Router = {
  events: {
    on(event: string, handler: RouteHandler) {
      const handlers = listeners.get(event) ?? new Set<RouteHandler>();
      handlers.add(handler);
      listeners.set(event, handlers);
    },
    off(event: string, handler: RouteHandler) {
      listeners.get(event)?.delete(handler);
    },
  },
};
