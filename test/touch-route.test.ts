import { describe, expect, it } from 'vitest';
import { resolveTouchRouteOrigin } from '@/lib/touch-route';

describe('resolveTouchRouteOrigin', () => {
  it('uses the last accepted touch step as the next route origin', () => {
    const selectedMapTileInfo = {
      x: 2,
      y: 2,
      half: false,
      unitsCount: 18,
    };

    const origin = resolveTouchRouteOrigin(selectedMapTileInfo, {
      x: 3,
      y: 2,
    });

    expect(origin).toEqual({
      x: 3,
      y: 2,
      half: false,
      unitsCount: 18,
    });
  });

  it('falls back to the selected tile before any step has been accepted', () => {
    const selectedMapTileInfo = {
      x: 5,
      y: 4,
      half: true,
      unitsCount: 9,
    };

    const origin = resolveTouchRouteOrigin(selectedMapTileInfo, {
      x: -1,
      y: -1,
    });

    expect(origin).toBe(selectedMapTileInfo);
  });
});
