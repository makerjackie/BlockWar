import type { ReactNode } from 'react';

type RoomSessionGateTone = 'ember' | 'sky' | 'rose';

interface RoomSessionGateProps {
  variant?: 'page' | 'overlay';
  tone?: RoomSessionGateTone;
  label: string;
  title: string;
  description: string;
  roomId?: string;
  detail?: string;
  action?: ReactNode;
}

const toneStyles: Record<
  RoomSessionGateTone,
  {
    accent: string;
    dot: string;
    badge: string;
  }
> = {
  ember: {
    accent: 'var(--bw-ember)',
    dot: 'color-mix(in srgb, var(--bw-ember) 82%, var(--bw-bg))',
    badge: 'color-mix(in srgb, var(--bw-ember) 16%, var(--bw-panel))',
  },
  sky: {
    accent: 'color-mix(in srgb, var(--bw-link) 88%, white 12%)',
    dot: 'color-mix(in srgb, var(--bw-link) 84%, var(--bw-bg))',
    badge: 'color-mix(in srgb, var(--bw-link) 14%, var(--bw-panel))',
  },
  rose: {
    accent: 'color-mix(in srgb, #ff6b6b 88%, white 12%)',
    dot: 'color-mix(in srgb, #ff6b6b 78%, var(--bw-bg))',
    badge: 'color-mix(in srgb, #ff6b6b 14%, var(--bw-panel))',
  },
};

export default function RoomSessionGate({
  variant = 'page',
  tone = 'ember',
  label,
  title,
  description,
  roomId,
  detail,
  action,
}: RoomSessionGateProps) {
  const isOverlay = variant === 'overlay';
  const currentTone = toneStyles[tone];

  return (
    <div
      className={
        isOverlay
          ? 'fixed inset-0 z-[1450] grid place-items-center px-4 py-8'
          : 'flex min-h-dvh items-center justify-center px-4 py-24'
      }
      style={
        isOverlay
          ? {
              background:
                'color-mix(in srgb, var(--bw-bg) 80%, transparent)',
              backdropFilter: 'blur(10px)',
            }
          : undefined
      }
    >
      <div className='bw-panel-hard w-full max-w-[36rem] px-5 py-5 sm:px-6 sm:py-6'>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='flex items-center gap-2.5'>
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className='block size-3 animate-pulse'
                style={{
                  backgroundColor: currentTone.dot,
                  animationDelay: `${index * 180}ms`,
                  animationDuration: '1.2s',
                }}
              />
            ))}
          </div>
          <span
            className='text-[11px] font-black uppercase tracking-[0.22em] sm:text-xs'
            style={{ color: currentTone.accent }}
          >
            {label}
          </span>
          {roomId ? (
            <span
              className='border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]'
              style={{
                borderColor: 'var(--bw-line)',
                background: currentTone.badge,
                color: 'var(--bw-ink-soft)',
              }}
            >
              #{roomId}
            </span>
          ) : null}
        </div>

        <div className='mt-5 space-y-3'>
          <h1
            className='text-2xl font-black uppercase leading-tight tracking-[0.08em] sm:text-[2rem]'
            style={{ color: 'var(--bw-ink)' }}
          >
            {title}
          </h1>
          <p className='bw-page-copy max-w-2xl'>{description}</p>
        </div>

        <div
          className='mt-5 border px-4 py-4'
          style={{
            borderColor: 'var(--bw-line)',
            background: 'var(--bw-panel)',
          }}
        >
          <div
            className='h-1.5 w-full overflow-hidden'
            style={{ background: 'color-mix(in srgb, var(--bw-line) 74%, transparent)' }}
          >
            <div
              className='h-full w-2/5 animate-[pulse_1.4s_ease-in-out_infinite]'
              style={{ background: currentTone.accent }}
            />
          </div>
          {detail ? (
            <p
              className='mt-4 text-sm leading-6'
              style={{ color: 'var(--bw-ink-soft)' }}
            >
              {detail}
            </p>
          ) : null}
          {action ? <div className='mt-4'>{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
