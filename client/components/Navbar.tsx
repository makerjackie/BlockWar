import { useState, type ReactNode } from 'react';
import {
  BookOpen,
  Menu,
  MessageSquareWarning,
  Moon,
  Sun,
  Users,
  ChevronDown,
  Globe,
} from 'lucide-react';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useThemeMode } from '@/context/ThemeModeContext';
import {
  fallbackLanguage,
  resolveSupportedLanguage,
} from '@/lib/language';
import HowToPlay from './HowToPlay';

import Link from 'next/link';

const languageLabels: Record<string, string> = {
  en: 'EN',
  zh: '中',
};

function GitHubMarkIcon() {
  return (
    <svg
      viewBox='0 0 24 24'
      className='size-4'
      aria-hidden='true'
      focusable='false'
      fill='currentColor'
    >
      <path d='M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' />
    </svg>
  );
}

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  iconOnly?: boolean;
  a11yLabel?: string;
};

const primaryNavItems: NavItem[] = [
  {
    href: 'https://github.com/makerjackie/BlockWar#readme',
    label: 'wiki',
    icon: <BookOpen size={18} strokeWidth={2.35} />,
    external: true,
  },
  {
    href: 'https://github.com/makerjackie/BlockWar/issues',
    label: 'feedback',
    icon: <MessageSquareWarning size={18} strokeWidth={2.35} />,
    external: true,
  },
];

const utilityNavItems: NavItem[] = [
  {
    href: 'https://github.com/makerjackie/BlockWar',
    label: 'source',
    a11yLabel: 'github',
    icon: <GitHubMarkIcon />,
    external: true,
    iconOnly: true,
  },
  {
    href: 'http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=VAwNA8NiYUMsPHrBxLso-t09saGZCT14&authKey=fFpto%2Ff%2FhNUpcxZhSVZt6msLOZrMhW3e14mypEBlO3Ih7PdqOmXq%2FQ0OlV3D%2BuyO&noverify=0&group_code=374889821',
    label: 'qq',
    icon: <Users size={16} strokeWidth={2.25} />,
    external: true,
  },
];

function Navbar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [show, setShow] = useState(false);
  const { mode, toggleMode } = useThemeMode();

  const toggleShow = () => {
    setShow(!show);
  };

  const router = useRouter();

  const handleLanguageChange = async (lang: string) => {
    await router.push(router.asPath, undefined, { locale: lang });
  };

  const { t, i18n } = useTranslation();
  const locale =
    resolveSupportedLanguage(router.locale) ??
    resolveSupportedLanguage(i18n.resolvedLanguage) ??
    resolveSupportedLanguage(i18n.language) ??
    fallbackLanguage;
  const isChinese = locale === 'zh';
  const languageOptions =
    router.locales && router.locales.length > 0
      ? router.locales
      : [fallbackLanguage];
  const navLinkClass = `navbar-link navbar-link-primary ${
    isChinese ? 'navbar-link-zh' : 'navbar-link-en'
  }`;
  const mobileNavLinkClass = `${navLinkClass} navbar-link-mobile`;
  const utilityNavLinkClass = `navbar-utility-link ${
    isChinese ? 'navbar-link-zh' : 'navbar-link-en'
  }`;
  const themeToggleLabel =
    mode === 'dark' ? t('switch-to-light') : t('switch-to-dark');
  const mobileNavItems = [...primaryNavItems, ...utilityNavItems];
  const renderLanguageSwitcher = (className: string) => (
    <div className='relative flex items-center'>
      <Globe
        className='pointer-events-none absolute left-3 text-zinc-500'
        size={14}
        strokeWidth={2.4}
      />
      <select
        className={className}
        value={locale}
        onChange={(event) => {
          void handleLanguageChange(event.target.value);
        }}
        aria-label='Language'
      >
        {languageOptions.map((lang) => (
          <option key={lang} value={lang}>
            {languageLabels[lang] ?? lang}
          </option>
        ))}
      </select>
      <ChevronDown
        className='pointer-events-none absolute right-2 text-zinc-500'
        size={14}
        strokeWidth={2.4}
      />
    </div>
  );

  return (
    <header className='navbar'>
      <div className='dock'>
        <Link
          href='/'
          className='bw-navbar-brand group flex min-w-0 items-center gap-3'
          aria-label='BlockWar home'
        >
          <div className='bw-brand-mark'>
            <img src='/img/blockwar-mark.svg' alt='' className='size-6 md:size-7' draggable={false} />
          </div>
          <div className='flex flex-col justify-center'>
            <span className={`bw-brand-title ${isChinese ? 'bw-brand-title-zh' : 'bw-brand-title-en'}`}>
              {isChinese ? '方块战争' : 'BLOCKWAR'}
            </span>
          </div>
        </Link>

        <nav className='hidden min-w-0 flex-1 items-center justify-start gap-2 md:pl-2 lg:pl-6 md:flex'>
          {primaryNavItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={navLinkClass}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
            >
              {item.icon}
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className='navbar-tools'>
          <div className='navbar-utility-group'>
            {utilityNavItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className={item.iconOnly ? 'navbar-utility-icon' : utilityNavLinkClass}
                aria-label={t(item.a11yLabel ?? item.label)}
                title={t(item.a11yLabel ?? item.label)}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
              >
                {item.icon}
                {item.iconOnly ? (
                  <span className='sr-only'>{t(item.a11yLabel ?? item.label)}</span>
                ) : (
                  t(item.label)
                )}
              </Link>
            ))}
          </div>
          <button
            type='button'
            className='navbar-tool-icon'
            onClick={toggleMode}
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {mode === 'dark' ? (
              <Sun size={16} strokeWidth={2.4} />
            ) : (
              <Moon size={16} strokeWidth={2.4} />
            )}
          </button>
          <button
            type='button'
            className='navbar-tool-button navbar-tool-button-primary'
            onClick={toggleShow}
          >
            {t('how-to-play')}
          </button>
          {renderLanguageSwitcher(
            'navbar-language-switch pl-8 pr-7 text-sm font-black tracking-[0.08em]'
          )}
        </div>

        <div className='ml-auto flex shrink-0 items-center gap-1.5 md:hidden'>
          <button
            type='button'
            className='navbar-tool-icon size-11 min-h-11 shrink-0'
            onClick={toggleMode}
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {mode === 'dark' ? (
              <Sun size={16} strokeWidth={2.4} />
            ) : (
              <Moon size={16} strokeWidth={2.4} />
            )}
          </button>
          {renderLanguageSwitcher(
            'navbar-language-switch h-11 min-h-11 w-16 min-w-0 pl-7 pr-6 text-sm font-black tracking-[0.08em]'
          )}
        </div>

        <button
          type='button'
          aria-label='Open navigation menu'
          aria-expanded={isNavOpen}
          className='grid size-11 shrink-0 place-items-center border border-zinc-500/50 bg-zinc-950 text-zinc-50 md:hidden'
          onClick={() => setIsNavOpen((value) => !value)}
        >
          <Menu size={18} strokeWidth={2.5} />
        </button>
      </div>

      {isNavOpen && (
        <div className='menu-container mx-auto mt-2 w-[calc(100%-2rem)] max-w-6xl p-2 md:hidden pointer-events-auto'>
          <nav className='grid gap-1'>
            {mobileNavItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className={mobileNavLinkClass}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                onClick={() => setIsNavOpen(false)}
              >
                {item.icon}
                {t(item.label)}
              </Link>
            ))}
          </nav>
          <div className='mt-2 border-t border-zinc-800 pt-2'>
            <button
              type='button'
              className='bw-button bw-button-primary h-11 w-full text-xs'
              onClick={() => {
                setIsNavOpen(false);
                toggleShow();
              }}
            >
              {t('how-to-play')}
            </button>
          </div>
        </div>
      )}
      <HowToPlay show={show} toggleShow={toggleShow} />
    </header>
  );
}
export default Navbar;
