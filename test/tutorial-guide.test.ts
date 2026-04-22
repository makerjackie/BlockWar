import { describe, expect, it } from 'vitest';
import enCommon from '@/public/locales/en/common.json';
import zhCommon from '@/public/locales/zh/common.json';
import {
  normalizeOnboardingStatus,
  shouldShowOnboardingPrompt,
} from '@/lib/onboarding';
import {
  advanceTutorialStage,
  getTutorialStageTranslationKey,
  getTutorialStageIndex,
  tutorialStages,
} from '@/lib/tutorial-guide';

function sentenceCount(text: string) {
  if (!text.trim()) {
    return 0;
  }

  const matches = text.match(/[.!?。！？]/g);
  return matches ? matches.length : 1;
}

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

  it('keeps desktop and touch tutorial copy to a single sentence', () => {
    const localizedGuides = [
      { language: 'en', guide: enCommon.tutorialGuide },
      { language: 'zh', guide: zhCommon.tutorialGuide },
    ];

    localizedGuides.forEach(({ language, guide }) => {
      tutorialStages.forEach((stage) => {
        const translationKey = getTutorialStageTranslationKey(stage);
        const step = guide.steps[translationKey as keyof typeof guide.steps];

        expect(typeof step.copy, `${language}:${stage}:copy`).toBe('string');
        expect(typeof step.copyTouch, `${language}:${stage}:copyTouch`).toBe('string');
        expect(sentenceCount(step.copy), `${language}:${stage}:copy`).toBeLessThanOrEqual(1);
        expect(
          sentenceCount(step.copyTouch),
          `${language}:${stage}:copyTouch`
        ).toBeLessThanOrEqual(1);
      });
    });
  });

  it('uses touch-first wording without directional words in mobile tutorial copy', () => {
    const localizedGuides = [
      { language: 'en', guide: enCommon.tutorialGuide, touchCue: /\b(touch|drag|tap)\b/i },
      { language: 'zh', guide: zhCommon.tutorialGuide, touchCue: /[点滑]/ },
    ];

    localizedGuides.forEach(({ language, guide, touchCue }) => {
      tutorialStages.forEach((stage) => {
        const translationKey = getTutorialStageTranslationKey(stage);
        const step = guide.steps[translationKey as keyof typeof guide.steps];

        expect(step.copyTouch, `${language}:${stage}:touch cue`).toMatch(touchCue);
        expect(step.copyTouch, `${language}:${stage}:english directions`).not.toMatch(
          /\b(up|down|left|right)\b/i
        );
        expect(step.copyTouch, `${language}:${stage}:chinese directions`).not.toMatch(
          /(向上|向下|向左|向右|往上|往下|往左|往右|上滑|下滑|左滑|右滑)/
        );
      });
    });
  });
});

describe('loading tips copy', () => {
  it('keeps tactical loading tips for half-army, timing, and swamps in both locales', () => {
    const localizedTips = [
      {
        language: 'en',
        tips: enCommon.loadingTips.items,
        halfArmyCue: /\bZ\b|half/i,
        timingCue: /25 seconds|income tick/i,
        swampCue: /swamp/i,
      },
      {
        language: 'zh',
        tips: zhCommon.loadingTips.items,
        halfArmyCue: /Z|半兵/,
        timingCue: /25 秒|产兵/,
        swampCue: /沼泽|掉兵/,
      },
    ];

    localizedTips.forEach(
      ({ language, tips, halfArmyCue, timingCue, swampCue }) => {
        expect(Array.isArray(tips), `${language}:tips`).toBe(true);
        expect(tips.length, `${language}:tip count`).toBeGreaterThanOrEqual(3);

        const joinedTips = tips.join(' ');
        expect(joinedTips, `${language}:half-army`).toMatch(halfArmyCue);
        expect(joinedTips, `${language}:timing`).toMatch(timingCue);
        expect(joinedTips, `${language}:swamp`).toMatch(swampCue);
      }
    );
  });

  it('includes core shortcut reminders in both locales', () => {
    const localizedTips = [
      {
        language: 'en',
        tips: enCommon.loadingTips.items,
      },
      {
        language: 'zh',
        tips: zhCommon.loadingTips.items,
      },
    ];

    localizedTips.forEach(({ language, tips }) => {
      const joinedTips = tips.join(' ');

      expect(joinedTips, `${language}:shortcut:g`).toMatch(/\bG\b/);
      expect(joinedTips, `${language}:shortcut:h`).toMatch(/\bH\b/);
      expect(joinedTips, `${language}:shortcut:c`).toMatch(/\bC\b/);
      expect(joinedTips, `${language}:shortcut:e`).toMatch(/\bE\b/);
      expect(joinedTips, `${language}:shortcut:q`).toMatch(/\bQ\b/);
      expect(joinedTips, `${language}:shortcut:zoom`).toMatch(
        /1\s*\/\s*2\s*\/\s*3/
      );
    });
  });
});
