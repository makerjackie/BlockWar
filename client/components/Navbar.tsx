import { useState } from 'react';
import {
  BookOpen,
  GitFork,
  House,
  Menu,
  MessageSquareWarning,
  Moon,
  Sun,
  Users,
} from 'lucide-react';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useThemeMode } from '@/context/ThemeModeContext';
import HowToPlay from './HowToPlay';

import Link from 'next/link';

const navItems = [
  { href: '/', label: 'home', icon: <House size={16} strokeWidth={2.25} /> },
  {
    href: 'https://github.com/makerjackie/BlockWar#readme',
    label: 'wiki',
    icon: <BookOpen size={16} strokeWidth={2.25} />,
  },
  {
    href: 'https://github.com/makerjackie/BlockWar',
    label: 'github',
    icon: <GitFork size={16} strokeWidth={2.25} />,
  },
  {
    href: 'https://github.com/makerjackie/BlockWar/issues',
    label: 'feedback',
    icon: <MessageSquareWarning size={16} strokeWidth={2.25} />,
  },
  {
    href: 'http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=VAwNA8NiYUMsPHrBxLso-t09saGZCT14&authKey=fFpto%2Ff%2FhNUpcxZhSVZt6msLOZrMhW3e14mypEBlO3Ih7PdqOmXq%2FQ0OlV3D%2BuyO&noverify=0&group_code=374889821',
    label: 'qq-group',
    icon: <Users size={16} strokeWidth={2.25} />,
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
  const locale = router.locale ?? i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const isChinese = locale.startsWith('zh');
  const brandTitle = isChinese ? '方块战争' : 'BlockWar';
  const brandSubtitle = isChinese ? 'BlockWar' : '方块战争';
  const navLinkClass = `navbar-link ${isChinese ? 'navbar-link-zh' : 'navbar-link-en'}`;
  const mobileNavLinkClass = `${navLinkClass} navbar-link-mobile`;
  const themeToggleLabel =
    mode === 'dark' ? t('switch-to-light') : t('switch-to-dark');
  const themeToggleText = mode === 'dark' ? t('theme-light') : t('theme-dark');

  return (
    <header className='navbar'>
      <div className='dock'>
        <Link
          href='/'
          className='group flex min-w-0 items-center gap-3 text-zinc-50'
        >
          <span className='bw-brand-mark'>
            <img
              src='/img/blockwar-mark.svg'
              alt='BlockWar'
              className='size-8'
              draggable={false}
            />
          </span>
          <span className='min-w-0'>
            <span
              className={`bw-brand-title ${isChinese ? 'bw-brand-title-zh' : 'bw-brand-title-en'}`}
            >
              {brandTitle}
            </span>
            <span
              className={`bw-brand-subtitle ${
                isChinese ? 'bw-brand-subtitle-en' : 'bw-brand-subtitle-zh'
              }`}
            >
              {brandSubtitle}
            </span>
          </span>
        </Link>

        <nav className='hidden min-w-0 flex-1 items-center justify-center gap-2 md:flex'>
          {navItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={navLinkClass}
            >
              {item.icon}
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className='hidden items-center gap-3 md:flex'>
          <button
            type='button'
            className='bw-button bw-button-secondary h-10 min-h-10 px-3 text-xs'
            onClick={toggleMode}
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
          >
            {mode === 'dark' ? (
              <Sun size={15} strokeWidth={2.4} />
            ) : (
              <Moon size={15} strokeWidth={2.4} />
            )}
            {themeToggleText}
          </button>
          <button
            type='button'
            className='bw-button bw-button-primary h-10 min-h-10 px-3 text-xs'
            onClick={toggleShow}
          >
            {t('how-to-play')}
          </button>
          <select
            className='navbar-language-switch px-3 text-sm font-black uppercase tracking-[0.14em]'
            value={router.locale ?? 'en'}
            onChange={(event) => {
              void handleLanguageChange(event.target.value);
            }}
            aria-label='Language'
          >
            {router.locales &&
              router.locales.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
          </select>
        </div>

        <button
          type='button'
          aria-label='Open navigation menu'
          aria-expanded={isNavOpen}
          className='ml-auto grid size-11 place-items-center border border-zinc-500/50 bg-zinc-950 text-zinc-50 md:hidden'
          onClick={() => setIsNavOpen((value) => !value)}
        >
          <Menu size={18} strokeWidth={2.5} />
        </button>
      </div>

      {isNavOpen && (
        <div className='menu-container mx-3 mt-2 p-2 md:hidden'>
          <nav className='grid gap-1'>
            {navItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className={mobileNavLinkClass}
                onClick={() => setIsNavOpen(false)}
              >
                {item.icon}
                {t(item.label)}
              </Link>
            ))}
          </nav>
          <div className='mt-2 grid gap-2 border-t border-zinc-800 pt-2'>
            <div className='grid grid-cols-2 gap-2'>
              <button
                type='button'
                className='bw-button bw-button-primary text-xs'
                onClick={toggleShow}
              >
                {t('how-to-play')}
              </button>
              <button
                type='button'
                className='bw-button bw-button-secondary text-xs'
                onClick={toggleMode}
                aria-label={themeToggleLabel}
              >
                {mode === 'dark' ? (
                  <Sun size={15} strokeWidth={2.4} />
                ) : (
                  <Moon size={15} strokeWidth={2.4} />
                )}
                {themeToggleText}
              </button>
            </div>
            <select
              className='navbar-language-switch px-3 text-sm font-black uppercase'
              value={router.locale ?? 'en'}
              onChange={(event) => {
                void handleLanguageChange(event.target.value);
              }}
              aria-label='Language'
            >
              {router.locales &&
                router.locales.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}
      <HowToPlay show={show} toggleShow={toggleShow} />
    </header>
  );
}
export default Navbar;
