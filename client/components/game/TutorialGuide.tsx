import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useGame } from '@/context/GameContext';
import useMediaQuery from '@/hooks/useMediaQuery';
import {
  advanceTutorialStage,
  getTutorialStageIndex,
  getTutorialStageTranslationKey,
  getTutorialStepCopyField,
  tutorialStages,
  type TutorialStage,
} from '@/lib/tutorial-guide';

export default function TutorialGuide() {
  const {
    room,
    mapData,
    mapQueueData,
    myPlayerId,
    selectedMapTileInfo,
  } = useGame();
  const { t } = useTranslation();
  const isMobileGuide = useMediaQuery('(max-width: 767px)');
  const [stage, setStage] = useState<TutorialStage>('first-move');
  const [visible, setVisible] = useState(true);

  const myPlayerColor = useMemo(() => {
    return room.players.find((player) => player.id === myPlayerId)?.color ?? null;
  }, [myPlayerId, room.players]);

  const snapshot = useMemo(() => {
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
      ownedLandCount,
      halfArmySelected,
    };
  }, [
    mapData,
    mapQueueData,
    myPlayerColor,
    selectedMapTileInfo.half,
  ]);

  useEffect(() => {
    if (room.preset !== 'tutorial' || !room.gameStarted) return;
    setStage('first-move');
    setVisible(true);
  }, [room.gameStarted, room.preset]);

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
        className='fixed left-4 top-20 z-[120] border px-3 py-2 text-xs font-black uppercase tracking-[0.16em] backdrop-blur transition hover:bg-[var(--bw-ember)] hover:text-[var(--bw-selection-ink)]'
        style={{
          borderColor: 'color-mix(in srgb, var(--bw-ember) 40%, transparent)',
          backgroundColor: 'var(--bw-panel-strong)',
          color: 'var(--bw-ember)',
          boxShadow: 'var(--bw-shadow-soft)',
        }}
        onClick={() => setVisible(true)}
      >
        {t('tutorialGuide.show')}
      </button>
    );
  }

  const translationKey = getTutorialStageTranslationKey(stage);
  const copyField = getTutorialStepCopyField(isMobileGuide);
  const stageNumber = getTutorialStageIndex(stage);

  return (
    <section
      className='fixed inset-x-3 top-16 z-[120] mx-auto max-w-lg border p-3 backdrop-blur sm:inset-x-4 sm:p-4 md:top-20'
      style={{
        borderColor: 'color-mix(in srgb, var(--bw-ember) 40%, transparent)',
        backgroundColor: 'var(--bw-panel-strong)',
        color: 'var(--bw-ink)',
        boxShadow: 'var(--bw-shadow)',
      }}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='bw-page-copy' style={{ color: 'var(--bw-ember)' }}>
            {t('tutorialGuide.progress', {
              current: stageNumber,
              total: tutorialStages.length,
            })}
          </p>
          <h2 className='mt-1 text-lg font-black sm:text-xl'>
            {t(`tutorialGuide.steps.${translationKey}.title`)}
          </h2>
        </div>
        <button
          type='button'
          className='border px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition hover:border-[var(--bw-ember)] hover:text-[var(--bw-ember)]'
          style={{ borderColor: 'var(--bw-line-strong)', color: 'var(--bw-muted)' }}
          onClick={() => setVisible(false)}
        >
          {t('tutorialGuide.hide')}
        </button>
      </div>

      <p className='mt-2 text-sm leading-5 sm:mt-3 sm:leading-6' style={{ color: 'var(--bw-ink-soft)' }}>
        {t(`tutorialGuide.steps.${translationKey}.${copyField}`)}
      </p>
    </section>
  );
}
