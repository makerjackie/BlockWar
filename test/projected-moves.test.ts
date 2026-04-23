import { describe, expect, it } from 'vitest';
import { projectQueuedMoves } from '@/lib/projected-moves';
import type { AttackRoute } from '@/lib/attack-queue';
import { TileType, type MapData } from '@/lib/types';

function createVerticalMap(units: number[]) {
  return units.map((unit, index) => {
    return [[TileType.Plain, index === 0 ? 1 : null, unit]];
  }) as MapData;
}

function createRoute(fromX: number, toX: number, half = false): AttackRoute {
  return {
    from: { x: fromX, y: 0 },
    to: { x: toX, y: 0 },
    half,
  };
}

describe('projectQueuedMoves', () => {
  it('stops long queued routes once a stack would run out of movable units', () => {
    const mapData = createVerticalMap([5, 0, 0, 0, 0, 0]);

    const successfulProjection = projectQueuedMoves({
      mapData,
      players: [{ color: 1, team: 1 }],
      plannedRoutes: [
        createRoute(0, 1),
        createRoute(1, 2),
        createRoute(2, 3),
        createRoute(3, 4),
      ],
      fallbackPosition: { x: 0, y: 0 },
    });

    expect(successfulProjection.ok).toBe(true);
    expect(successfulProjection.end).toEqual({
      position: { x: 4, y: 0 },
      color: 1,
      unitsCount: 1,
    });

    const exhaustedProjection = projectQueuedMoves({
      mapData,
      players: [{ color: 1, team: 1 }],
      plannedRoutes: [
        createRoute(0, 1),
        createRoute(1, 2),
        createRoute(2, 3),
        createRoute(3, 4),
        createRoute(4, 5),
      ],
      fallbackPosition: { x: 0, y: 0 },
    });

    expect(exhaustedProjection.ok).toBe(false);
    expect(exhaustedProjection.end).toEqual({
      position: { x: 4, y: 0 },
      color: 1,
      unitsCount: 1,
    });
  });

  it('tracks half moves when forecasting the current route head', () => {
    const mapData = createVerticalMap([6, 0, 0, 0, 0]);

    const projection = projectQueuedMoves({
      mapData,
      players: [{ color: 1, team: 1 }],
      plannedRoutes: [
        createRoute(0, 1, true),
        createRoute(1, 2),
        createRoute(2, 3),
      ],
      fallbackPosition: { x: 0, y: 0 },
    });

    expect(projection.ok).toBe(true);
    expect(projection.end).toEqual({
      position: { x: 3, y: 0 },
      color: 1,
      unitsCount: 1,
    });
  });
});
