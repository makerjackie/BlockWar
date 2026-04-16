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
    let stage = advanceTutorialStage('select-general', {
      selectedGeneral: false,
      ownedLandCount: 1,
      halfArmySelected: false,
    });
    expect(stage).toBe('select-general');

    stage = advanceTutorialStage(stage, {
      selectedGeneral: true,
      ownedLandCount: 1,
      halfArmySelected: false,
    });
    expect(stage).toBe('expand-frontier');

    stage = advanceTutorialStage(stage, {
      selectedGeneral: false,
      ownedLandCount: 2,
      halfArmySelected: false,
    });
    expect(stage).toBe('split-army');

    stage = advanceTutorialStage(stage, {
      selectedGeneral: false,
      ownedLandCount: 2,
      halfArmySelected: true,
    });
    expect(stage).toBe('hunt-king');
    expect(getTutorialStageIndex(stage)).toBe(4);
  });
});
