import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';

interface GameLoadingProps {
  variant?: 'overlay' | 'embedded';
  showStatusLabel?: boolean;
}

const GameLoading: React.FC<GameLoadingProps> = ({
  variant = 'overlay',
  showStatusLabel = true,
}) => {
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
  }, [tips]);

  const advanceTip = useCallback(() => {
    if (tips.length <= 1) {
      return;
    }

    setTipIndex((current) => (current + 1) % tips.length);
  }, [tips.length]);

  useEffect(() => {
    if (tips.length <= 1) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      advanceTip();
    }, 4200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [advanceTip, tipIndex, tips.length]);

  const activeTip = tips[tipIndex] ?? '';
  const isOverlay = variant === 'overlay';

  return (
    <div
      className={
        isOverlay
          ? 'fixed inset-0 z-[1400] grid place-items-center bg-zinc-950/70 backdrop-blur-sm'
          : 'w-full'
      }
    >
      <div
        className={`bw-panel-hard px-5 py-5 sm:px-6 ${
          isOverlay ? 'w-[min(92vw,34rem)]' : 'w-full'
        }`}
      >
        {showStatusLabel ? (
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
        ) : null}

        {activeTip ? (
          <div
            className={`${showStatusLabel ? 'mt-4' : ''} border px-4 py-4`}
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
              <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
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
                  <span
                    className='text-[11px] font-black uppercase tracking-[0.16em]'
                    style={{ color: 'var(--bw-muted)' }}
                  >
                    {tipIndex + 1}/{tips.length}
                  </span>
                </div>
                <button
                  type='button'
                  className='bw-button bw-button-secondary min-h-9 px-3 text-[11px]'
                  onClick={advanceTip}
                >
                  {t('loadingTips.next')}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GameLoading;
