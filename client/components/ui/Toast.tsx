import { useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ToastStatus = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  open: boolean;
  title?: string;
  message: string;
  status?: ToastStatus;
  duration?: number | null;
  onClose: () => void;
}

const statusMap: Record<
  ToastStatus,
  {
    icon: LucideIcon;
    accent: string;
    border: string;
    text: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accent: 'bg-emerald-400',
    border: 'border-emerald-300/70',
    text: 'text-emerald-200',
  },
  error: {
    icon: AlertCircle,
    accent: 'bg-red-400',
    border: 'border-red-300/70',
    text: 'text-red-200',
  },
  warning: {
    icon: AlertTriangle,
    accent: 'bg-yellow-300',
    border: 'border-yellow-300/70',
    text: 'text-yellow-200',
  },
  info: {
    icon: Info,
    accent: 'bg-sky-400',
    border: 'border-sky-300/70',
    text: 'text-sky-200',
  },
};

export default function Toast({
  open,
  title,
  message,
  status = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open || duration === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [duration, onClose, open]);

  if (!open) {
    return null;
  }

  const currentStatus = statusMap[status];
  const Icon = currentStatus.icon;

  return (
    <div className='pointer-events-none fixed inset-x-4 top-20 z-[1600] flex justify-end md:inset-x-6'>
      <div
        className={`pointer-events-auto relative w-full max-w-md border bg-zinc-950/96 p-4 text-zinc-100 shadow-[10px_10px_0_#000] backdrop-blur-xl ${currentStatus.border}`}
        role='alert'
        aria-live='assertive'
      >
        <div className='absolute left-0 top-0 h-full w-1 bg-zinc-50/80'>
          <div className={`h-14 w-full ${currentStatus.accent}`} />
        </div>
        <div className='flex items-start gap-3 pl-3'>
          <div className={`mt-0.5 shrink-0 ${currentStatus.text}`}>
            <Icon size={18} strokeWidth={2.4} />
          </div>
          <div className='min-w-0 flex-1'>
            {title ? (
              <div className='text-xs font-black uppercase tracking-[0.18em] text-zinc-400'>
                {title}
              </div>
            ) : null}
            <div className='mt-1 text-sm text-zinc-100'>{message}</div>
          </div>
          <button
            type='button'
            className='grid size-8 shrink-0 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-300 transition hover:border-zinc-100 hover:text-zinc-50'
            onClick={onClose}
            aria-label='Close notification'
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
