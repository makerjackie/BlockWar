import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useGame } from '@/context/GameContext';
import { getStrategistHints } from '@/lib/strategist-hints';

export default function StrategistHint() {
  const { room, mapData, myPlayerId, initGameInfo } = useGame();
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  const hints = useMemo(() => {
    if (!room.gameStarted || room.preset === 'tutorial') {
      return [];
    }

    return getStrategistHints({
      mapData,
      players: room.players,
      myPlayerId,
      capital: initGameInfo?.king ?? null,
    });
  }, [initGameInfo?.king, mapData, myPlayerId, room.gameStarted, room.players, room.preset]);

  const hintSignature = useMemo(
    () => hints.map((hint) => hint.id).join('|'),
    [hints]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [hintSignature]);

  useEffect(() => {
    if (hints.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % hints.length);
    }, 4200);

    return () => {
      window.clearInterval(timer);
    };
  }, [hints.length]);

  if (hints.length === 0) {
    return null;
  }

  const activeHint = hints[activeIndex % hints.length];
  const hintMessage = t(`strategist.messages.${activeHint.key}`, {
    player: activeHint.player,
    units: activeHint.units,
    distance: activeHint.distance,
    count: activeHint.count,
  });

  return (
    <section
      className='pointer-events-none fixed z-[109] w-[min(20rem,calc(100vw-0.75rem))] border px-3 py-2 backdrop-blur-xl sm:w-[min(22rem,calc(100vw-1rem))]'
      style={{
        top: 'calc(env(safe-area-inset-top) + 4.5rem)',
        left: 'max(0.25rem, env(safe-area-inset-left))',
        borderColor: 'color-mix(in srgb, var(--bw-line-strong) 42%, transparent)',
        backgroundColor:
          'color-mix(in srgb, var(--bw-panel-strong) 88%, transparent)',
        boxShadow: 'var(--bw-shadow-soft)',
      }}
    >
      <p
        className='text-[10px] font-black uppercase tracking-[0.18em]'
        style={{ color: 'var(--bw-ember)' }}
      >
        {t('strategist.title')}
      </p>
      <p
        className='mt-1 text-sm leading-5'
        style={{ color: 'var(--bw-ink-soft)' }}
      >
        {hintMessage}
      </p>
    </section>
  );
}
