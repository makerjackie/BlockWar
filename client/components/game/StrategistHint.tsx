import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'next-i18next';
import { useGame } from '@/context/GameContext';
import useMediaQuery from '@/hooks/useMediaQuery';
import { getStrategistHints } from '@/lib/strategist-hints';
import {
  clampStrategistPanelPosition,
  getDefaultStrategistPanelPosition,
  readStrategistPanelPosition,
  type StrategistPanelPosition,
  writeStrategistPanelPosition,
} from '@/lib/strategist-panel-position';

export default function StrategistHint() {
  const { room, mapData, myPlayerId, initGameInfo } = useGame();
  const { t } = useTranslation();
  const panelRef = useRef<HTMLElement | null>(null);
  const stopDraggingRef = useRef<(() => void) | null>(null);
  const isMobileHint = useMediaQuery('(max-width: 639px)');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<StrategistPanelPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const measurePanel = useCallback(() => {
    if (typeof window === 'undefined' || !panelRef.current) {
      return null;
    }

    const rect = panelRef.current.getBoundingClientRect();
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      panel: {
        width: rect.width,
        height: rect.height,
      },
    };
  }, []);

  const syncPosition = useCallback(
    (candidate?: StrategistPanelPosition | null) => {
      const measured = measurePanel();
      if (!measured) {
        return null;
      }

      const nextPosition = candidate
        ? clampStrategistPanelPosition(
            candidate,
            measured.viewport,
            measured.panel
          )
        : getDefaultStrategistPanelPosition(
            measured.viewport,
            measured.panel,
            isMobileHint
          );

      setPosition((currentPosition) => {
        if (
          currentPosition &&
          currentPosition.x === nextPosition.x &&
          currentPosition.y === nextPosition.y
        ) {
          return currentPosition;
        }
        return nextPosition;
      });

      return nextPosition;
    },
    [isMobileHint, measurePanel]
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      syncPosition(readStrategistPanelPosition());
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [hints.length, syncPosition]);

  useEffect(() => {
    if (!position) {
      return;
    }

    writeStrategistPanelPosition(position);
  }, [position]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      window.requestAnimationFrame(() => {
        syncPosition(position);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [position, syncPosition]);

  useEffect(() => {
    return () => {
      stopDraggingRef.current?.();
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const measured = measurePanel();
      const panelNode = panelRef.current;
      if (!measured || !panelNode) {
        return;
      }

      stopDraggingRef.current?.();
      event.preventDefault();

      const rect = panelNode.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;

      setIsDragging(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        moveEvent.preventDefault();
        setPosition(
          clampStrategistPanelPosition(
            {
              x: moveEvent.clientX - offsetX,
              y: moveEvent.clientY - offsetY,
            },
            {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            measured.panel
          )
        );
      };

      const stopDragging = () => {
        setIsDragging(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopDragging);
        window.removeEventListener('pointercancel', stopDragging);
        stopDraggingRef.current = null;
      };

      stopDraggingRef.current = stopDragging;
      window.addEventListener('pointermove', handlePointerMove, {
        passive: false,
      });
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    },
    [measurePanel]
  );

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
      ref={panelRef}
      className='pointer-events-none fixed left-1/2 top-16 z-[109] flex w-[min(22rem,calc(100vw-1rem))] -translate-x-1/2 flex-col items-center border px-3 py-2 text-center backdrop-blur-xl sm:top-4 sm:w-[min(28rem,calc(100vw-2rem))]'
      style={{
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        transform: position ? 'none' : undefined,
        borderColor: 'color-mix(in srgb, var(--bw-line-strong) 42%, transparent)',
        backgroundColor:
          'color-mix(in srgb, var(--bw-panel-strong) 88%, transparent)',
        boxShadow: 'var(--bw-shadow-soft)',
      }}
    >
      <button
        type='button'
        className={`pointer-events-auto inline-flex items-center gap-2 border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          color: 'var(--bw-ember)',
          borderColor: 'color-mix(in srgb, var(--bw-ember) 30%, transparent)',
          backgroundColor:
            'color-mix(in srgb, var(--bw-panel-strong) 76%, transparent)',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
      >
        <span aria-hidden className='text-[8px] tracking-[0.08em]'>
          ⋮⋮
        </span>
        <span>{t('strategist.title')}</span>
      </button>
      <p
        className='mt-1 text-sm leading-5'
        style={{ color: 'var(--bw-ink-soft)' }}
      >
        {hintMessage}
      </p>
    </section>
  );
}
