import React from 'react';
import { useTranslation } from 'next-i18next';

interface GameLoadingProps {}

const GameLoading: React.FC<GameLoadingProps> = () => {
  const { t } = useTranslation();

  return (
    <div className='fixed inset-0 z-[1400] grid place-items-center bg-zinc-950/70 backdrop-blur-sm'>
      <div className='bw-panel-hard flex items-center gap-4 px-6 py-4'>
        <div className='size-4 animate-pulse bg-yellow-300' />
        <span className='text-sm font-black uppercase tracking-[0.22em] text-zinc-50'>
          {t('game-loading')}
        </span>
      </div>
    </div>
  );
};

export default GameLoading;
