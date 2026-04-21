import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'next-i18next';
import { GripHorizontal, Radar } from 'lucide-react';
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

const useSafeLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface StrategistDisplayMessage {
  id: string;
  text: string;
}

export default function StrategistHint() {
  const { room, mapData, myPlayerId, initGameInfo } = useGame();
  const { t } = useTranslation();
  const panelRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<StrategistPanelPosition | null>(null);
  const positionRef = useRef<StrategistPanelPosition | null>(null);
  const stopDraggingRef = useRef<(() => void) | null>(null);
  const isMobileHint = useMediaQuery('(max-width: 639px)');
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<StrategistPanelPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isStrategistVisible = room.gameStarted && room.preset !== 'tutorial';

  const hints = useMemo(() => {
    if (!isStrategistVisible) {
      return [];
    }

    return getStrategistHints({
      mapData,
      players: room.players,
      myPlayerId,
      capital: initGameInfo?.king ?? null,
    });
  }, [initGameInfo?.king, isStrategistVisible, mapData, myPlayerId, room.players]);

  const myPlayerName = useMemo(() => {
    return (
      room.players.find((player) => player.id === myPlayerId)?.username ??
      t('anonymous')
    );
  }, [myPlayerId, room.players, t]);

  const messages = useMemo<StrategistDisplayMessage[]>(() => {
    if (hints.length === 0) {
      return [
        {
          id: `idle:${myPlayerName}`,
          text: t('strategist.idle.greeting', { player: myPlayerName }),
        },
      ];
    }

    return hints.map((hint) => ({
      id: hint.id,
      text: t(`strategist.messages.${hint.key}`, {
        player: hint.player,
        units: hint.units,
        distance: hint.distance,
        count: hint.count,
      }),
    }));
  }, [hints, myPlayerName, t]);

  const hintSignature = useMemo(
    () => messages.map((message) => message.id).join('|'),
    [messages]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [hintSignature]);

  useEffect(() => {
    if (messages.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % messages.length);
    }, 4200);

    return () => {
      window.clearInterval(timer);
    };
  }, [messages.length]);

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

  const commitPosition = useCallback(
    (nextPosition: StrategistPanelPosition, persist = false) => {
      positionRef.current = nextPosition;
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

      if (persist) {
        writeStrategistPanelPosition(nextPosition);
      }
    },
    []
  );

  const syncPosition = useCallback(
    (candidate?: StrategistPanelPosition | null, persist = false) => {
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

      commitPosition(nextPosition, persist);

      return nextPosition;
    },
    [commitPosition, isMobileHint, measurePanel]
  );

  const schedulePosition = useCallback(
    (nextPosition: StrategistPanelPosition) => {
      if (typeof window === 'undefined') {
        return;
      }

      pendingPositionRef.current = nextPosition;
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        if (!pendingPositionRef.current) {
          return;
        }

        const latestPosition = pendingPositionRef.current;
        pendingPositionRef.current = null;
        commitPosition(latestPosition);
      });
    },
    [commitPosition]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !isStrategistVisible) {
      return;
    }

    const handleResize = () => {
      window.requestAnimationFrame(() => {
        syncPosition(positionRef.current, true);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isStrategistVisible, syncPosition]);

  useSafeLayoutEffect(() => {
    if (!isStrategistVisible) {
      return;
    }

    syncPosition(readStrategistPanelPosition());
  }, [isStrategistVisible, isMobileHint, syncPosition]);

  useEffect(() => {
    return () => {
      stopDraggingRef.current?.();
      if (typeof window !== 'undefined' && frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
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
        schedulePosition(
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
        if (typeof window !== 'undefined' && frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        if (pendingPositionRef.current) {
          const latestPosition = pendingPositionRef.current;
          pendingPositionRef.current = null;
          commitPosition(latestPosition, true);
        } else if (positionRef.current) {
          writeStrategistPanelPosition(positionRef.current);
        }
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
    [commitPosition, measurePanel, schedulePosition]
  );

  if (!isStrategistVisible) {
    return null;
  }

  const activeMessage =
    messages[activeIndex % messages.length]?.text ??
    t('strategist.idle.greeting', { player: myPlayerName });

  return (
    <section
      ref={panelRef}
      className='pointer-events-none fixed left-0 top-0 z-[109] flex w-[min(44rem,calc(100vw-0.75rem))] items-center gap-2 border px-2 py-2 backdrop-blur-xl sm:w-[min(46rem,calc(100vw-2rem))]'
      style={{
        visibility: position ? 'visible' : 'hidden',
        transform: position
          ? `translate3d(${position.x}px, ${position.y}px, 0)`
          : 'translate3d(-9999px, -9999px, 0)',
        borderColor: 'color-mix(in srgb, var(--bw-line-strong) 42%, transparent)',
        backgroundColor:
          'color-mix(in srgb, var(--bw-panel-strong) 88%, transparent)',
        boxShadow: 'var(--bw-shadow-soft)',
        willChange: isDragging ? 'transform' : undefined,
      }}
    >
      <button
        type='button'
        className={`pointer-events-auto inline-flex shrink-0 items-center gap-1.5 border-r pr-2 text-[10px] font-black uppercase tracking-[0.18em] select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          color: 'var(--bw-ember)',
          borderColor: 'color-mix(in srgb, var(--bw-line) 72%, transparent)',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        title={t('strategist.title')}
      >
        <span
          aria-hidden
          className='grid size-5 place-items-center border'
          style={{
            borderColor: 'color-mix(in srgb, var(--bw-ember) 32%, transparent)',
            backgroundColor:
              'color-mix(in srgb, var(--bw-panel-strong) 78%, transparent)',
          }}
        >
          <Radar size={12} className='bw-strategist-icon' />
        </span>
        <span>{t('strategist.title')}</span>
        <GripHorizontal size={11} strokeWidth={2.2} />
      </button>
      <p
        className='min-w-0 flex-1 truncate text-sm leading-5'
        title={activeMessage}
        style={{ color: 'var(--bw-ink-soft)' }}
      >
        {activeMessage}
      </p>
    </section>
  );
}
