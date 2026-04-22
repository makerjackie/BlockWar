import { useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Clock3 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import Navbar from '@/components/Navbar';
import { changelogEntries } from '@/lib/changelog';
import {
  fallbackLanguage,
  resolveSupportedLanguage,
  type SupportedLanguage,
} from '@/lib/language';

const pageCopy: Record<
  SupportedLanguage,
  {
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  en: {
    eyebrow: 'What\'s New',
    title: 'Game Updates',
    description:
      'Track the latest improvements to gameplay, features, and player experience.',
  },
  zh: {
    eyebrow: '最新动态',
    title: '游戏更新',
    description: '记录游戏玩法、功能和体验的最新改进。',
  },
};

function ChangelogPage() {
  const router = useRouter();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const locale =
    resolveSupportedLanguage(router.locale) ??
    resolveSupportedLanguage(i18n.resolvedLanguage) ??
    resolveSupportedLanguage(i18n.language) ??
    fallbackLanguage;
  const copy = pageCopy[locale];

  useEffect(() => {
    if (!location.hash || location.hash === '#') {
      return;
    }

    const targetId = location.hash.slice(1);
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.hash]);

  return (
    <>
      <Head>
        <title>{copy.title} | BlockWar / 方块战争</title>
      </Head>
      <Navbar />
      <main className='min-h-dvh bg-[var(--bw-bg)] px-3 pb-14 pt-24 sm:px-4 sm:pt-28'>
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-4'>
          <section className='bw-card-grid px-4 py-5 sm:px-6 sm:py-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div className='max-w-2xl'>
                <p className='text-xs font-bold uppercase tracking-wider' style={{ color: 'var(--bw-ember)' }}>
                  {copy.eyebrow}
                </p>
                <h1 className='mt-2 text-3xl font-black tracking-tight sm:text-4xl'>
                  {copy.title}
                </h1>
                <p
                  className='mt-3 max-w-xl text-sm leading-relaxed'
                  style={{ color: 'var(--bw-ink-soft)' }}
                >
                  {copy.description}
                </p>
              </div>
              <Link href='/' className='bw-button bw-button-secondary self-start px-4'>
                <ArrowLeft size={16} strokeWidth={2.4} />
                {t('home')}
              </Link>
            </div>
          </section>

          <section className='scroll-mt-24'>
            <div className='grid gap-3'>
              {changelogEntries.map((entry) => (
                <article key={entry.date} className='bw-panel-hard px-4 py-4 sm:px-5 sm:py-5'>
                  <div className='flex flex-col gap-2.5'>
                    <div className='flex items-center gap-2'>
                      <Clock3 size={14} strokeWidth={2.2} style={{ color: 'var(--bw-muted)' }} />
                      <time className='text-xs font-bold' style={{ color: 'var(--bw-muted)' }}>
                        {entry.date}
                      </time>
                    </div>
                    <h2 className='text-xl font-black tracking-tight sm:text-2xl'>
                      {entry.title[locale]}
                    </h2>
                    <ul
                      className='mt-0.5 grid gap-2 text-sm leading-relaxed'
                      style={{ color: 'var(--bw-ink-soft)' }}
                    >
                      {entry.items[locale].map((item) => (
                        <li
                          key={item}
                          className='border-l-2 pl-3'
                          style={{ borderColor: 'var(--bw-line-strong)' }}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default ChangelogPage;

export async function getStaticProps(context: any) {
  const { locale } = context;

  return {
    props: {
      ...(await serverSideTranslations(locale)),
    },
  };
}
