import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { RoomUiStatus } from '@/lib/types';
import { useGame, useGameDispatch } from '@/context/GameContext';
import ModalShell from '@/components/ui/ModalShell';

export default function OverDialog() {
  const { myPlayerId, room, dialogContent, openOverDialog } = useGame();
  const { setRoomUiStatus, setOpenOverDialog } = useGameDispatch();
  const [replayLink, setReplayLink] = React.useState('');
  const { t } = useTranslation();
  const router = useRouter();

  let title = '';
  let subtitle = '';
  const [userData, gameStatus] = dialogContent;

  if (gameStatus === 'game_surrender') {
    title = t('you-surrender');
  }
  if (userData) {
    if (gameStatus === 'game_over') {
      title = t('game-over');
      subtitle = `${t('captured-by')}: ${userData[0]?.username}`;
    }
    if (gameStatus === 'game_ended') {
      title =
        userData.filter((x) => x?.id === myPlayerId).length > 0
          ? t('you-win')
          : t('game-over');
      subtitle = `${t('winner')}: ${userData.map((x) => x?.username).join(', ')}!`;
    }
  }

  useEffect(() => {
    const [, currentStatus, currentReplayLink] = dialogContent;
    setReplayLink(currentStatus === 'game_ended' ? currentReplayLink ?? '' : '');
  }, [dialogContent]);

  const handleExit = () => {
    router.push('/');
    setOpenOverDialog(false);
  };

  const handleBackRoom = () => {
    if (!room.gameStarted) setRoomUiStatus(RoomUiStatus.gameSetting);
    setOpenOverDialog(false);
  };

  const handleWatchReplay = () => {
    router.push(`/replays/${replayLink}`);
    setOpenOverDialog(false);
  };

  return (
    <ModalShell
      open={openOverDialog}
      onClose={() => setOpenOverDialog(false)}
      closeOnBackdrop={false}
      title={
        <div>
          <p className='bw-page-copy'>Battle Result</p>
          <h2 className='bw-title text-4xl'>{title}</h2>
        </div>
      }
      widthClassName='max-w-xl'
      actions={
        <>
          <button
            type='button'
            className='bw-button bw-button-primary'
            onClick={handleBackRoom}
          >
            {room.gameStarted ? t('spectate') : t('play-again')}
          </button>
          {replayLink && (
            <button
              type='button'
              className='bw-button bw-button-secondary'
              onClick={handleWatchReplay}
            >
              {t('watch-replay')}
            </button>
          )}
          <button type='button' className='bw-button bw-button-secondary' onClick={handleExit}>
            {t('exit')}
          </button>
          <button
            type='button'
            className='bw-button bw-button-secondary'
            onClick={() => {
              setOpenOverDialog(false);
            }}
          >
            {t('cancel')}
          </button>
        </>
      }
    >
      {subtitle ? <p className='text-zinc-300'>{subtitle}</p> : null}
    </ModalShell>
  );
}
