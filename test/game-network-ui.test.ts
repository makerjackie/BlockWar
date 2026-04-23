import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '../src/app/i18n';
import LeaderBoard from '@/components/game/LeaderBoard';

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
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
}

function renderLeaderBoard(viewportWidth: number) {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      matchMedia: createMatchMedia(viewportWidth),
    },
  });

  try {
    return renderToStaticMarkup(
      React.createElement(LeaderBoard, {
        players: [
          { color: 1, username: 'Alice', latencyMs: 48 },
          { color: 2, username: 'Bob', latencyMs: null },
        ] as any,
        leaderBoardTable: [
          [1, 1, 42, 7],
          [2, 2, 38, 6],
        ],
      })
    );
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  }
}

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('game network ui', () => {
  it('shows per-player latency in the expanded in-game leaderboard', () => {
    const html = renderLeaderBoard(1280);

    expect(html).toContain('48ms');
    expect(html).toContain('Ping: 48ms');
    expect(html).toContain('Ping: --');
  });
});
