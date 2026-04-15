import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useGame } from '@/context/GameContext';
import { useRouter } from 'next/router';
import { RoomUiStatus } from '@/lib/types';
import { MaxTeamNum } from '@/lib/constants';
import ModalShell from '@/components/ui/ModalShell';

export default function SurrenderDialog({
  isOpen,
  setOpen,
  handleSurrender,
}: {
  isOpen: boolean;
  setOpen: any;
  handleSurrender: () => void;
}) {
  const { openOverDialog, isSurrendered, team, roomUiStatus } = useGame();
  const { t } = useTranslation();
  const router = useRouter();

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isOpen && !openOverDialog) {
        setOpen(true);
      }
    },
    [isOpen, openOverDialog, setOpen]
  );

  const showExitTitle =
    isSurrendered ||
    team === MaxTeamNum + 1 ||
    roomUiStatus === RoomUiStatus.gameOverConfirm;

  const handleCloseSurrender = useCallback(() => {
    setOpen(false);
    handleSurrender();
  }, [handleSurrender, setOpen]);

  const handleExit = useCallback(() => {
    setOpen(false);
    router.push('/');
  }, [router, setOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [handleKeydown]);

  return (
    <ModalShell
      open={isOpen}
      onClose={() => setOpen(false)}
      closeOnBackdrop={false}
      title={showExitTitle ? t('are-you-sure-to-exit') : t('are-you-sure-to-surrender')}
      widthClassName='max-w-lg'
      actions={
        <>
          {showExitTitle ? (
            <button type='button' className='bw-button bw-button-danger' onClick={handleExit}>
              {t('exit')}
            </button>
          ) : (
            <button
              type='button'
              className='bw-button bw-button-danger'
              onClick={handleCloseSurrender}
            >
              {t('surrender')}
            </button>
          )}
          <button
            type='button'
            className='bw-button bw-button-secondary'
            onClick={() => {
              setOpen(false);
            }}
          >
            {t('cancel')}
          </button>
        </>
      }
    >
      <p className='text-sm text-zinc-300'>
        {showExitTitle ? t('exit') : t('surrender')}
      </p>
    </ModalShell>
  );
}
