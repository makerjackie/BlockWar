import { describe, expect, it } from 'vitest';
import {
  normalizeOnboardingStatus,
  shouldShowOnboardingPrompt,
} from '@/lib/onboarding';
import {
  advanceTutorialStage,
  getTutorialStageIndex,
} from '@/lib/tutorial-guide';

describe('onboarding helpers', () => {
  it('normalizes unknown onboarding storage values as new users', () => {
    expect(normalizeOnboardingStatus(null)).toBe('new');
    expect(normalizeOnboardingStatus('')).toBe('new');
    expect(normalizeOnboardingStatus('completed')).toBe('completed');
    expect(normalizeOnboardingStatus('skipped')).toBe('skipped');
    expect(shouldShowOnboardingPrompt('new')).toBe(true);
    expect(shouldShowOnboardingPrompt('completed')).toBe(false);
  });
});

describe('tutorial guide progression', () => {
  it('advances only after the player performs each tutorial action', () => {
    let stage = advanceTutorialStage('first-move', {
      ownedLandCount: 1,
      halfArmySelected: false,
    });
    expect(stage).toBe('first-move');

    stage = advanceTutorialStage(stage, {
      ownedLandCount: 2,
      halfArmySelected: false,
    });
    expect(stage).toBe('grow-income');

    stage = advanceTutorialStage(stage, {
      ownedLandCount: 3,
      halfArmySelected: false,
    });
    expect(stage).toBe('grow-income');

    stage = advanceTutorialStage(stage, {
      ownedLandCount: 4,
      halfArmySelected: false,
    });
    expect(stage).toBe('split-army');

    stage = advanceTutorialStage(stage, {
      ownedLandCount: 4,
      halfArmySelected: true,
    });
    expect(stage).toBe('hunt-king');
    expect(getTutorialStageIndex(stage)).toBe(4);
  });
});
