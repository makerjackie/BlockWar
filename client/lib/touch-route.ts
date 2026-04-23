import type { Position, SelectedMapTileInfo } from '@/lib/types';

export function resolveTouchRouteOrigin(
  selectedMapTileInfo: SelectedMapTileInfo,
  lastTouchPosition: Position
): SelectedMapTileInfo {
  if (lastTouchPosition.x < 0 || lastTouchPosition.y < 0) {
    return selectedMapTileInfo;
  }

  return {
    ...selectedMapTileInfo,
    x: lastTouchPosition.x,
    y: lastTouchPosition.y,
  };
}
