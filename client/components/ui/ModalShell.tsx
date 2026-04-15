import { ReactNode, useEffect } from 'react';
import ClearIcon from '@mui/icons-material/Clear';

interface ModalShellProps {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  widthClassName?: string;
}

export default function ModalShell({
  open,
  title,
  children,
  actions,
  onClose,
  closeOnBackdrop = true,
  showCloseButton = true,
  widthClassName = 'max-w-3xl',
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[1500] flex items-center justify-center bg-black/78 px-4 py-6 backdrop-blur-sm'
      onClick={() => {
        if (closeOnBackdrop) onClose();
      }}
    >
      <div
        className={`bw-panel-hard relative max-h-[85vh] w-full ${widthClassName} overflow-hidden`}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className='flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4'>
            <div className='min-w-0'>
              {typeof title === 'string' ? (
                <h2 className='bw-title text-3xl'>{title}</h2>
              ) : (
                title
              )}
            </div>
            {showCloseButton && (
              <button
                type='button'
                className='grid size-10 shrink-0 place-items-center border border-zinc-700 bg-zinc-950 text-zinc-100 transition hover:bg-yellow-300 hover:text-zinc-950'
                onClick={onClose}
                aria-label='Close dialog'
              >
                <ClearIcon fontSize='small' />
              </button>
            )}
          </div>
        )}
        <div className='max-h-[calc(85vh-8rem)] overflow-auto px-5 py-4'>
          {children}
        </div>
        {actions && (
          <div className='flex flex-wrap justify-end gap-2 border-t border-zinc-800 px-5 py-4'>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
