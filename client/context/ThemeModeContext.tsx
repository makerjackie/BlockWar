import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '@/components/theme';

const STORAGE_KEY = 'blockwar-theme-mode';

type ThemePreferenceSource = 'system' | 'user';

interface ThemeState {
  mode: ThemeMode;
  source: ThemePreferenceSource;
}

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function getStoredMode(): ThemeMode | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  return storedMode === 'light' || storedMode === 'dark' ? storedMode : null;
}

function getSystemMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getInitialThemeState(): ThemeState {
  const storedMode = getStoredMode();

  if (storedMode) {
    return {
      mode: storedMode,
      source: 'user',
    };
  }

  return {
    mode: getSystemMode(),
    source: 'system',
  };
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeState, setThemeState] = useState<ThemeState>(getInitialThemeState);

  useLayoutEffect(() => {
    applyThemeMode(themeState.mode);
  }, [themeState.mode]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (themeState.source === 'user') {
      window.localStorage.setItem(STORAGE_KEY, themeState.mode);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, [themeState.mode, themeState.source]);

  useEffect(() => {
    if (typeof window === 'undefined' || themeState.source === 'user') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setThemeState((currentState) => {
        if (currentState.source === 'user') {
          return currentState;
        }

        return {
          mode: event.matches ? 'dark' : 'light',
          source: 'system',
        };
      });
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, [themeState.source]);

  const setMode = useCallback((mode: ThemeMode) => {
    setThemeState({
      mode,
      source: 'user',
    });
  }, []);

  const toggleMode = useCallback(() => {
    setThemeState((currentState) => ({
      mode: currentState.mode === 'dark' ? 'light' : 'dark',
      source: 'user',
    }));
  }, []);

  const contextValue = {
    mode: themeState.mode,
    setMode,
    toggleMode,
  };

  return (
    <ThemeModeContext.Provider value={contextValue}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within AppThemeProvider');
  }

  return context;
}
