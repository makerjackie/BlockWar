import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import ModalShell from '@/components/ui/ModalShell';

interface PublishMapDialogProps {
  open: boolean;
  onClose: () => void;
  mapId: string;
}

export default function PublishMapDialog({
  open,
  onClose,
  mapId,
}: PublishMapDialogProps) {
  const router = useRouter();
  const [copySuccess, setCopySuccess] = useState(false);
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    setMapUrl(window.location.origin + '/maps/' + mapId);
  }, [mapId]);

  const handleCopyClick = () => {
    navigator.clipboard.writeText(mapUrl);
    setCopySuccess(true);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title='Custom Map Published'
      actions={
        <>
          <button
            type='button'
            className='bw-button bw-button-secondary'
            onClick={() => {
              router.push('/maps/' + mapId);
            }}
          >
            View Map
          </button>
          <button type='button' className='bw-button bw-button-secondary' onClick={onClose}>
            Close
          </button>
        </>
      }
      widthClassName='max-w-2xl'
    >
      <div className='space-y-4'>
        <p className='bw-page-copy'>Deploy Result</p>
        <div className='border border-zinc-800 bg-zinc-950/80 p-4 text-sm text-zinc-200 break-all'>
          {mapUrl}
        </div>
        <button
          type='button'
          className='bw-button bw-button-primary'
          onClick={handleCopyClick}
        >
          {copySuccess ? 'Copied!' : 'Copy Link'}
        </button>
      </div>
    </ModalShell>
  );
}
