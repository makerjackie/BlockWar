import MenuIcon from '@mui/icons-material/Menu';
import {
  BookRounded,
  FeedbackRounded,
  Contacts,
  GitHub,
  HomeRounded,
} from '@mui/icons-material';

import { useState } from 'react';

import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import HowToPlay from './HowToPlay';

import Link from 'next/link';

const navItems = [
  { href: '/', label: 'home', icon: <HomeRounded fontSize='small' /> },
  {
    href: 'https://github.com/makerjackie/BlockWar#readme',
    label: 'wiki',
    icon: <BookRounded fontSize='small' />,
  },
  {
    href: 'https://github.com/makerjackie/BlockWar',
    label: 'github',
    icon: <GitHub fontSize='small' />,
  },
  {
    href: 'https://github.com/makerjackie/BlockWar/issues',
    label: 'feedback',
    icon: <FeedbackRounded fontSize='small' />,
  },
  {
    href: 'http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=VAwNA8NiYUMsPHrBxLso-t09saGZCT14&authKey=fFpto%2Ff%2FhNUpcxZhSVZt6msLOZrMhW3e14mypEBlO3Ih7PdqOmXq%2FQ0OlV3D%2BuyO&noverify=0&group_code=374889821',
    label: 'qq-group',
    icon: <Contacts fontSize='small' />,
  },
];

function Navbar() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [show, setShow] = useState(false);

  const toggleShow = () => {
    setShow(!show);
  };

  const router = useRouter();

  const handleLanguageChange = async (lang: string) => {
    await router.push(router.asPath, undefined, { locale: lang });
  };

  const { t } = useTranslation();

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
            <span className='bw-brand-text block truncate text-lg font-black uppercase tracking-[-0.05em] md:text-xl'>
              BlockWar
            </span>
            <span className='block text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500 group-hover:text-yellow-300'>
              方块战争
            </span>
          </span>
        </Link>

        <nav className='hidden items-center gap-2 md:flex'>
          {navItems.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              id='navbar-link'
              className='flex min-h-10 items-center gap-2 border border-transparent px-3 text-xs text-zinc-300 transition hover:border-zinc-500/60 hover:bg-zinc-900 hover:text-zinc-50'
            >
              {item.icon}
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className='hidden items-center gap-3 md:flex'>
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
          className='grid size-11 place-items-center border border-zinc-500/50 bg-zinc-950 text-zinc-50 md:hidden'
          onClick={() => setIsNavOpen((value) => !value)}
        >
          <MenuIcon />
        </button>
      </div>

      {isNavOpen && (
        <div className='mx-3 mt-2 border border-zinc-500/40 bg-zinc-950/95 p-2 shadow-[6px_6px_0_#000] backdrop-blur-xl md:hidden'>
          <nav className='grid gap-1'>
            {navItems.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                className='flex min-h-11 items-center gap-3 border border-transparent px-3 text-sm font-black uppercase tracking-[0.14em] text-zinc-200 hover:border-yellow-300 hover:text-yellow-300'
                onClick={() => setIsNavOpen(false)}
              >
                {item.icon}
                {t(item.label)}
              </Link>
            ))}
          </nav>
          <div className='mt-2 grid grid-cols-[1fr_auto] gap-2 border-t border-zinc-800 pt-2'>
            <button
              type='button'
              className='bw-button bw-button-primary text-xs'
              onClick={toggleShow}
            >
              {t('how-to-play')}
            </button>
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
