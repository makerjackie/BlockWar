import Block from './block';
import { TileProp, TilesProp, MapDiffData } from './types';

function flattenBlockViews(blockMap: Block[][]): TilesProp {
  const tiles: TilesProp = [];

  for (let x = 0; x < blockMap.length; x += 1) {
    for (let y = 0; y < blockMap[x].length; y += 1) {
      tiles.push(blockMap[x][y].getView());
    }
  }

  return tiles;
}

function isSameTile(left: TileProp | undefined, right: TileProp | undefined) {
  return !!left && !!right && left[0] === right[0] && left[1] === right[1] && left[2] === right[2];
}

class MapDiff {
  data: MapDiffData = [];
  prevMap: TilesProp | null = null;
  curSameCnt: number = 0;
  curDiffArr: TilesProp = [];

  constructor() { }

  addSame(): void {
    ++this.curSameCnt;
  }

  addDiff(block: TileProp): void {
    this.data.push(block);
  }

  endSame(): void {
    if (this.curSameCnt > 0) {
      this.data.push(this.curSameCnt);
      this.curSameCnt = 0;
    }
  }

  patch(blockMap: Block[][]): Promise<void> {
    const curMap = flattenBlockViews(blockMap);
    if (!this.prevMap || this.prevMap.length !== curMap.length) {
      this.data = curMap;
    } else {
      this.data = [];
      for (let i = 0; i < curMap.length; ++i) {
        if (isSameTile(this.prevMap[i], curMap[i])) {
          this.addSame();
        } else {
          this.endSame();
          this.addDiff(curMap[i]);
        }
      }
      this.endSame();
    }
    this.prevMap = curMap;
    return Promise.resolve();
  }
}

export default MapDiff;
