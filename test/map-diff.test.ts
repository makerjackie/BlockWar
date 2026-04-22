import { describe, expect, it } from 'vitest';
import SharedMapDiff from '@shared/game/map-diff';
import ClientMapDiff from '@/lib/map-diff';
import { TileType, type TileProp } from '@shared/game/types';

function makeBlock(tile: TileProp) {
  return {
    getView() {
      return tile;
    },
  };
}

function makeBlockMap(tiles: TileProp[][]) {
  return tiles.map((row) => row.map((tile) => makeBlock(tile)));
}

async function runCommonMapDiffAssertions(MapDiffCtor: new () => {
  data: unknown[];
  patch(blockMap: any[][]): Promise<void>;
}) {
  const diff = new MapDiffCtor();
  const initialMap = makeBlockMap([
    [
      [TileType.Plain, 1, 3],
      [TileType.City, 1, 10],
    ],
    [
      [TileType.Mountain, null, 0],
      [TileType.Plain, 2, 5],
    ],
  ]);

  await diff.patch(initialMap);

  expect(diff.data).toEqual([
    [TileType.Plain, 1, 3],
    [TileType.City, 1, 10],
    [TileType.Mountain, null, 0],
    [TileType.Plain, 2, 5],
  ]);

  const changedMap = makeBlockMap([
    [
      [TileType.Plain, 1, 3],
      [TileType.City, 1, 10],
    ],
    [
      [TileType.Mountain, null, 0],
      [TileType.Plain, 2, 6],
    ],
  ]);

  await diff.patch(changedMap);

  expect(diff.data).toEqual([
    3,
    [TileType.Plain, 2, 6],
  ]);

  await diff.patch(changedMap);

  expect(diff.data).toEqual([4]);
}

describe('MapDiff', () => {
  it('compresses diffs efficiently in the shared worker implementation', async () => {
    await runCommonMapDiffAssertions(SharedMapDiff as any);
  });

  it('compresses diffs efficiently in the client implementation', async () => {
    await runCommonMapDiffAssertions(ClientMapDiff as any);
  });
});
