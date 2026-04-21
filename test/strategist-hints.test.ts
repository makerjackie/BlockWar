import { describe, expect, it } from 'vitest';
import enCommon from '@/public/locales/en/common.json';
import zhCommon from '@/public/locales/zh/common.json';
import { getStrategistHints } from '@/lib/strategist-hints';
import { MapData, TileType } from '@/lib/types';

function tile(
  type: TileType,
  color: number | null,
  units: number | null
): [TileType, number | null, number | null] {
  return [type, color, units];
}

function createMap(width: number, height: number): MapData {
  return Array.from({ length: width }, () =>
    Array.from({ length: height }, () => tile(TileType.Fog, null, null))
  );
}

function sentenceCount(text: string) {
  if (!text.trim()) {
    return 0;
  }

  const matches = text.match(/[.!?。！？]/g);
  return matches ? matches.length : 1;
}

const players = [
  { id: 'me', username: 'Jackie', color: 1, team: 1 },
  { id: 'enemy-a', username: 'Raven', color: 2, team: 2 },
  { id: 'enemy-b', username: 'Lynx', color: 3, team: 3 },
  { id: 'ally', username: 'Moss', color: 4, team: 1 },
];

describe('strategist hint generation', () => {
  it('warns when an enemy army is near the capital', () => {
    const map = createMap(7, 7);
    map[3][3] = tile(TileType.King, 1, 6);
    map[5][3] = tile(TileType.Plain, 2, 5);

    const hints = getStrategistHints({
      mapData: map,
      players,
      myPlayerId: 'me',
      capital: { x: 3, y: 3 },
    });

    expect(hints).toContainEqual(
      expect.objectContaining({
        key: 'enemyNearCapital',
        player: 'Raven',
        distance: 2,
      })
    );
  });

  it('detects when a large enemy stack punches into owned territory', () => {
    const map = createMap(7, 7);
    map[4][4] = tile(TileType.King, 1, 6);
    map[2][3] = tile(TileType.Plain, 1, 3);
    map[3][2] = tile(TileType.Plain, 1, 4);
    map[4][3] = tile(TileType.Plain, 1, 2);
    map[3][3] = tile(TileType.Plain, 2, 11);

    const hints = getStrategistHints({
      mapData: map,
      players,
      myPlayerId: 'me',
      capital: { x: 4, y: 4 },
    });

    expect(hints).toContainEqual(
      expect.objectContaining({
        key: 'enemyInTerritory',
        player: 'Raven',
        units: 11,
      })
    );
  });

  it('summarizes sustained frontline pressure from a single enemy', () => {
    const map = createMap(8, 8);
    map[0][1] = tile(TileType.Plain, 1, 3);
    map[0][2] = tile(TileType.Plain, 1, 3);
    map[0][3] = tile(TileType.Plain, 1, 3);
    map[1][1] = tile(TileType.Plain, 3, 5);
    map[1][2] = tile(TileType.Plain, 3, 7);
    map[1][3] = tile(TileType.Plain, 3, 6);

    const hints = getStrategistHints({
      mapData: map,
      players,
      myPlayerId: 'me',
      capital: { x: 6, y: 6 },
    });

    expect(hints).toContainEqual(
      expect.objectContaining({
        key: 'frontlinePressure',
        player: 'Lynx',
        count: 3,
      })
    );
  });

  it('ignores allied tiles when building warnings', () => {
    const map = createMap(7, 7);
    map[3][3] = tile(TileType.King, 1, 5);
    map[4][3] = tile(TileType.Plain, 4, 9);

    const hints = getStrategistHints({
      mapData: map,
      players,
      myPlayerId: 'me',
      capital: { x: 3, y: 3 },
    });

    expect(hints).toHaveLength(0);
  });
});

describe('strategist copy', () => {
  it('keeps localized strategist messages to a single sentence', () => {
    const localizedCopies = [
      { language: 'en', strategist: enCommon.strategist },
      { language: 'zh', strategist: zhCommon.strategist },
    ];

    localizedCopies.forEach(({ language, strategist }) => {
      expect(typeof strategist.idle.greeting, `${language}:idle:greeting`).toBe('string');
      expect(
        sentenceCount(strategist.idle.greeting),
        `${language}:idle:greeting`
      ).toBeLessThanOrEqual(1);

      Object.entries(strategist.messages).forEach(([key, copy]) => {
        expect(typeof copy, `${language}:${key}`).toBe('string');
        expect(sentenceCount(copy), `${language}:${key}`).toBeLessThanOrEqual(1);
      });
    });
  });
});
