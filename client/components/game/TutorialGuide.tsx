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
  } = useGame();
  const { t } = useTranslation();
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

  const translationKey = stageTranslationKey(stage);
  const stageNumber = getTutorialStageIndex(stage);

  return (
    <section
      className='fixed inset-x-4 top-16 z-[120] mx-auto max-w-xl border p-4 backdrop-blur md:top-20'
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
          <h2 className='mt-1 text-xl font-black'>
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

      <p className='mt-3 text-sm leading-6' style={{ color: 'var(--bw-ink-soft)' }}>
        {t(`tutorialGuide.steps.${translationKey}.copy`)}
      </p>
      {stage === 'first-move' && (
        <div
          className='mt-3 border-l pl-3 text-sm'
          style={{ borderColor: 'var(--bw-line)', color: 'var(--bw-muted)' }}
        >
          {t('tutorialGuide.moveHint')}
        </div>
      )}
      {stage === 'grow-income' && (
        <div
          className='mt-3 flex items-center gap-2 border-l pl-3 text-sm'
          style={{ borderColor: 'var(--bw-line)', color: 'var(--bw-muted)' }}
        >
          <img
            src='/img/city.png'
            alt=''
            width={18}
            height={18}
            className='border bg-white'
            style={{ borderColor: 'var(--bw-line)' }}
            draggable={false}
          />
          <span>{t('tutorialGuide.cityHint')}</span>
        </div>
      )}
      {stage === 'hunt-king' && (
        <div
          className='mt-3 border-l pl-3 text-sm'
          style={{ borderColor: 'var(--bw-line)', color: 'var(--bw-muted)' }}
        >
          {t('tutorialGuide.captureHint')}
        </div>
      )}
    </section>
  );
}
