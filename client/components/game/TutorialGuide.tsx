import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useGame } from '@/context/GameContext';
import {
  advanceTutorialStage,
  getTutorialStageIndex,
  tutorialStages,
  type TutorialStage,
} from '@/lib/tutorial-guide';

function stageTranslationKey(stage: TutorialStage) {
  return stage.replace(/-/g, '_');
}

export default function TutorialGuide() {
  const {
    room,
    mapData,
    mapQueueData,
    myPlayerId,
    selectedMapTileInfo,
    initGameInfo,
  } = useGame();
  const { t } = useTranslation();
  const [stage, setStage] = useState<TutorialStage>('select-general');
  const [visible, setVisible] = useState(true);

  const myPlayerColor = useMemo(() => {
    return room.players.find((player) => player.id === myPlayerId)?.color ?? null;
  }, [myPlayerId, room.players]);

  const snapshot = useMemo(() => {
    const selectedGeneral =
      !!initGameInfo &&
      selectedMapTileInfo.x === initGameInfo.king.x &&
      selectedMapTileInfo.y === initGameInfo.king.y;
    const ownedLandCount =
      myPlayerColor === null
        ? 0
        : mapData.reduce((count, row) => {
            return (
              count +
              row.filter((tile) => tile[1] === myPlayerColor).length
            );
          }, 0);
    const halfArmySelected =
      selectedMapTileInfo.half ||
      mapQueueData.some((row) => row.some((queueItem) => !!queueItem?.half));

    return {
      selectedGeneral,
      ownedLandCount,
      halfArmySelected,
    };
  }, [
    initGameInfo,
    mapData,
    mapQueueData,
    myPlayerColor,
    selectedMapTileInfo.half,
    selectedMapTileInfo.x,
    selectedMapTileInfo.y,
  ]);

  useEffect(() => {
    if (room.preset !== 'tutorial' || !room.gameStarted) return;
    setStage('select-general');
    setVisible(true);
  }, [room.gameStarted, room.id, room.preset]);

  useEffect(() => {
    if (room.preset !== 'tutorial' || !room.gameStarted) return;
    setStage((currentStage) => advanceTutorialStage(currentStage, snapshot));
  }, [room.gameStarted, room.preset, snapshot]);

  if (room.preset !== 'tutorial' || !room.gameStarted) {
    return null;
  }

  if (!visible) {
    return (
      <button
        type='button'
        className='fixed left-4 top-20 z-[120] border border-yellow-300/40 bg-zinc-950/90 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-yellow-300 backdrop-blur transition hover:bg-yellow-300 hover:text-zinc-950'
        onClick={() => setVisible(true)}
      >
        {t('tutorialGuide.show')}
      </button>
    );
  }

  const translationKey = stageTranslationKey(stage);
  const stageNumber = getTutorialStageIndex(stage);

  return (
    <section className='fixed inset-x-4 top-16 z-[120] mx-auto max-w-xl border border-yellow-300/40 bg-zinc-950/90 p-4 text-zinc-100 shadow-2xl backdrop-blur md:top-20'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='bw-page-copy text-yellow-300'>
            {t('tutorialGuide.progress', {
              current: stageNumber,
              total: tutorialStages.length,
            })}
          </p>
          <h2 className='mt-1 text-xl font-black'>
            {t(`tutorialGuide.steps.${translationKey}.title`)}
          </h2>
        </div>
        <button
          type='button'
          className='border border-zinc-700 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 transition hover:border-yellow-300 hover:text-yellow-300'
          onClick={() => setVisible(false)}
        >
          {t('tutorialGuide.hide')}
        </button>
      </div>

      <p className='mt-3 text-sm leading-6 text-zinc-300'>
        {t(`tutorialGuide.steps.${translationKey}.copy`)}
      </p>
      {stage === 'select-general' && (
        <div className='mt-3 border-l border-zinc-700 pl-3 text-sm text-zinc-400'>
          {t('tutorialGuide.keyGHint')}
        </div>
      )}
      {stage === 'expand-frontier' && (
        <div className='mt-3 flex items-center gap-2 border-l border-zinc-700 pl-3 text-sm text-zinc-400'>
          <img
            src='/img/city.png'
            alt=''
            width={18}
            height={18}
            className='border border-zinc-800 bg-white'
            draggable={false}
          />
          <span>{t('tutorialGuide.cityHint')}</span>
        </div>
      )}
      {stage === 'hunt-king' && (
        <div className='mt-3 border-l border-zinc-700 pl-3 text-sm text-zinc-400'>
          {t('tutorialGuide.fogHint')}
        </div>
      )}
    </section>
  );
}
