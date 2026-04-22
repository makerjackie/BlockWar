import { useTranslation } from 'next-i18next';
import PingTest from '@/components/PingTest';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useThemeMode } from '@/context/ThemeModeContext';

interface TurnsCountProps {
  count: number;
  handleReturnClick: any;
  latencyMs?: number | null;
  connectionState?: 'connecting' | 'connected' | 'reconnecting';
}

function TurnsCount(props: TurnsCountProps) {
  const { count, handleReturnClick, latencyMs, connectionState } = props;
  const { t } = useTranslation();
  const { mode, toggleMode } = useThemeMode();

  const displayTurnsCount = Math.floor(count / 2);
  const themeToggleLabel =
    mode === 'dark' ? t('switch-to-light') : t('switch-to-dark');

  return (
    <div className='absolute left-px top-0 z-[110] flex flex-col items-start gap-1'>
      <div className='menu-container flex items-center gap-2 rounded-none border-l-0 px-2 py-2'>
        <button
          type='button'
          className='grid size-10 place-items-center border border-zinc-500/40 bg-zinc-950 text-zinc-50 transition hover:bg-yellow-300 hover:text-zinc-950'
          onClick={handleReturnClick}
          aria-label='Back'
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <button
          type='button'
          className='grid size-10 place-items-center border border-zinc-500/40 bg-zinc-950 text-zinc-50 transition hover:bg-yellow-300 hover:text-zinc-950'
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
        <div className='pr-1 text-sm font-black uppercase tracking-[0.18em] text-zinc-100'>
          {t('turn')}: {displayTurnsCount}
        </div>
      </div>
      {connectionState ? (
        <PingTest ping={latencyMs ?? null} connectionState={connectionState} />
      ) : null}
    </div>
  );
}

export default TurnsCount;
