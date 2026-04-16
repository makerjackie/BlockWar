export type TutorialStage =
  | 'select-general'
  | 'expand-frontier'
  | 'split-army'
  | 'hunt-king';

export const tutorialStages: TutorialStage[] = [
  'select-general',
  'expand-frontier',
  'split-army',
  'hunt-king',
];

export type TutorialSnapshot = {
  selectedGeneral: boolean;
  ownedLandCount: number;
  halfArmySelected: boolean;
};

export function advanceTutorialStage(
  currentStage: TutorialStage,
  snapshot: TutorialSnapshot
): TutorialStage {
  switch (currentStage) {
    case 'select-general':
      return snapshot.selectedGeneral ? 'expand-frontier' : currentStage;
    case 'expand-frontier':
      return snapshot.ownedLandCount > 1 ? 'split-army' : currentStage;
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
