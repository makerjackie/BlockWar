import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import TutorialSetupFlow from '@/components/game/TutorialSetupFlow';

function renderFlow(isLastStep: boolean) {
  return renderToStaticMarkup(
    React.createElement(TutorialSetupFlow, {
      badge: 'Beginner Tutorial',
      title: 'Before you start',
      progressLabel: isLastStep ? 'Step 3 / 3' : 'Step 1 / 3',
      stepIndex: isLastStep ? 2 : 0,
      totalSteps: 3,
      step: {
        id: isLastStep ? 'first-moves' : 'objective',
        label: isLastStep ? 'Final step' : 'First step',
        title: isLastStep ? 'Follow the top guide' : 'Capture one enemy king early',
        copy: isLastStep
          ? 'Return to your king, expand, then push for a crown.'
          : 'You only need one idea to begin.',
        icon: React.createElement('span', null, isLastStep ? 'K' : 'C'),
        detail: React.createElement(
          'div',
          null,
          isLastStep ? 'G · Return to king' : 'Capturing a crown flips territory'
        ),
        note: isLastStep ? 'Use G when you feel lost.' : undefined,
      },
      canGoBack: isLastStep,
      isLastStep,
      nextLabel: 'Next',
      backLabel: 'Back',
      startLabel: 'Start Beginner Tutorial',
      startingLabel: 'Starting Tutorial...',
      startBusy: false,
      startDisabled: false,
      onBack: () => {},
      onNext: () => {},
      onStart: () => {},
    })
  );
}

describe('TutorialSetupFlow', () => {
  it('renders one guided step with a next action before the final step', () => {
    const html = renderFlow(false);

    expect(html).toContain('Step 1 / 3');
    expect(html).toContain('Capture one enemy king early');
    expect(html).toContain('Capturing a crown flips territory');
    expect(html).toContain('Next');
    expect(html).not.toContain('Start Beginner Tutorial');
  });

  it('switches to the start action on the final step', () => {
    const html = renderFlow(true);

    expect(html).toContain('Step 3 / 3');
    expect(html).toContain('Back');
    expect(html).toContain('Start Beginner Tutorial');
    expect(html).toContain('G · Return to king');
    expect(html).toContain('Use G when you feel lost.');
    expect(html).not.toContain('>Next<');
  });
});
