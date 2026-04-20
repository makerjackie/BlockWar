export type TutorialStage =
  | 'first-move'
  | 'grow-income'
  | 'split-army'
  | 'hunt-king';

export const tutorialStages: TutorialStage[] = [
  'first-move',
  'grow-income',
  'split-army',
  'hunt-king',
];

export function getTutorialStageTranslationKey(stage: TutorialStage) {
  return stage.replace(/-/g, '_');
}

export function getTutorialStepCopyField(useTouchCopy: boolean) {
  return useTouchCopy ? 'copyTouch' : 'copy';
}

export type TutorialSnapshot = {
  ownedLandCount: number;
  halfArmySelected: boolean;
};

export function advanceTutorialStage(
  currentStage: TutorialStage,
  snapshot: TutorialSnapshot
): TutorialStage {
  switch (currentStage) {
    case 'first-move':
      return snapshot.ownedLandCount > 1 ? 'grow-income' : currentStage;
    case 'grow-income':
      return snapshot.ownedLandCount >= 4 ? 'split-army' : currentStage;
    case 'split-army':
      return snapshot.halfArmySelected ? 'hunt-king' : currentStage;
    case 'hunt-king':
    default:
      return currentStage;
  }
}

export function getTutorialStageIndex(stage: TutorialStage) {
  return tutorialStages.indexOf(stage) + 1;
}
