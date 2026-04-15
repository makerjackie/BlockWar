import * as React from 'react';

interface LoadingProps {
  open: boolean;
  title?: string;
}

const Loading: React.FC<LoadingProps> = ({ open, title }) => {
  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[1400] grid place-items-center bg-zinc-950/75 backdrop-blur-md'
      aria-labelledby='modal-modal-title'
      aria-describedby='modal-modal-description'
    >
      <div className='bw-panel-hard flex flex-col items-center gap-4 px-8 py-6'>
        <div className='size-4 animate-pulse bg-yellow-300' />
        <div className='text-center text-sm font-black uppercase tracking-[0.22em] text-zinc-50'>
          {title}
        </div>
      </div>
    </div>
  );
};

export default Loading;
