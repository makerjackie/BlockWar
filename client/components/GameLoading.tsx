import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';

interface GameLoadingProps {}

const GameLoading: React.FC<GameLoadingProps> = () => {
  const { t, i18n } = useTranslation();
  const [tipIndex, setTipIndex] = useState(0);
  const tips = useMemo(() => {
    const localizedTips = t('loadingTips.items', {
      returnObjects: true,
    }) as unknown;

    if (!Array.isArray(localizedTips)) {
      return [];
    }

    return localizedTips.map((tip) => String(tip));
  }, [i18n.language, i18n.resolvedLanguage, t]);

  useEffect(() => {
    setTipIndex(0);
  }, [tips.length]);

  useEffect(() => {
    if (tips.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % tips.length);
    }, 4200);

    return () => {
      window.clearInterval(timer);
    };
  }, [tips.length]);

  const activeTip = tips[tipIndex] ?? '';

  return (
    <div className='fixed inset-0 z-[1400] grid place-items-center bg-zinc-950/70 backdrop-blur-sm'>
      <div className='bw-panel-hard w-[min(92vw,34rem)] px-5 py-5 sm:px-6'>
        <div className='flex items-center gap-4'>
          <div
            className='size-4 animate-pulse'
            style={{ backgroundColor: 'var(--bw-ember)' }}
          />
          <span
            className='text-sm font-black uppercase tracking-[0.22em]'
            style={{ color: 'var(--bw-ink)' }}
          >
            {t('game-loading')}
          </span>
        </div>

        {activeTip ? (
          <div
            className='mt-4 border px-4 py-4'
            style={{
              borderColor: 'var(--bw-line)',
              background: 'var(--bw-panel)',
            }}
          >
            <p className='bw-page-copy'>{t('loadingTips.title')}</p>
            <p
              className='mt-3 text-sm leading-6'
              style={{ color: 'var(--bw-ink-soft)' }}
            >
              {activeTip}
            </p>
            {tips.length > 1 ? (
              <div className='mt-4 flex items-center gap-2'>
                {tips.map((_, index) => (
                  <span
                    key={index}
                    className='block h-1.5 w-6'
                    style={{
                      backgroundColor:
                        index === tipIndex ? 'var(--bw-ember)' : 'var(--bw-line)',
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GameLoading;
