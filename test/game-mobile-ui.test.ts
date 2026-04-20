import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../src/app/i18n';
import LeaderBoard from '@/components/game/LeaderBoard';
import TutorialGuide from '@/components/game/TutorialGuide';

const { mockUseGame } = vi.hoisted(() => {
  return {
    mockUseGame: vi.fn(),
  };
});

vi.mock('@/context/GameContext', () => {
  return {
    useGame: mockUseGame,
  };
});

function createMatchMedia(viewportWidth: number) {
  return (query: string) => {
    const maxWidthMatches = [...query.matchAll(/max-width:\s*(\d+)px/gi)];
    const matches =
      maxWidthMatches.length > 0
        ? maxWidthMatches.some((match) => {
            return viewportWidth <= Number(match[1]);
          })
        : false;

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

function renderWithViewport(viewportWidth: number, render: () => string) {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: createMatchMedia(viewportWidth),
    },
  });

  try {
    return render();
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  }
}

function renderLeaderBoard(viewportWidth: number) {
  return renderWithViewport(viewportWidth, () => {
    return renderToStaticMarkup(
      React.createElement(LeaderBoard, {
        players: [
          { color: 1, username: 'Alice' },
          { color: 2, username: 'Bob' },
        ] as any,
        leaderBoardTable: [
          [1, 1, 42, 7],
          [2, 2, 38, 6],
        ],
      })
    );
  });
}

function renderTutorialGuide(viewportWidth: number) {
  return renderWithViewport(viewportWidth, () => {
    return renderToStaticMarkup(React.createElement(TutorialGuide));
  });
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockUseGame.mockReturnValue({
    room: {
      preset: 'tutorial',
      gameStarted: true,
      players: [{ id: 'player-1', color: 1 }],
    },
    mapData: [[[4, 1, 2]]],
    mapQueueData: [],
    myPlayerId: 'player-1',
    selectedMapTileInfo: {
      x: 0,
      y: 0,
      half: false,
      unitsCount: 2,
    },
  });
});

describe('mobile game ui', () => {
  it('defaults the in-game leaderboard to compact mode on mobile', () => {
    const html = renderLeaderBoard(390);

    expect(html).toContain('min-w-[116px]');
    expect(html).toContain('LB');
    expect(html).not.toContain('Leaderboard');
  });

  it('keeps the leaderboard expanded on desktop screens', () => {
    const html = renderLeaderBoard(1280);

    expect(html).toContain('min-w-[220px]');
    expect(html).toContain('Leaderboard');
    expect(html).toContain('Alice');
  });

  it('renders touch-specific tutorial guidance on mobile', () => {
    const html = renderTutorialGuide(390);

    expect(html).toContain(
      'Touch the selected tile and drag into a neighboring tile to make your first move.'
    );
    expect(html).not.toContain(
      'Move from your capital into a neighboring tile to learn the basic attack flow.'
    );
    expect(html).not.toContain('You can move with WASD');
  });

  it('keeps desktop tutorial guidance on larger screens', () => {
    const html = renderTutorialGuide(1280);

    expect(html).toContain(
      'Move from your capital into a neighboring tile to learn the basic attack flow.'
    );
    expect(html).not.toContain(
      'Touch the selected tile and drag into a neighboring tile to make your first move.'
    );
  });
});
