export const MIN_MAP_ZOOM = 0.2;
export const MAX_MAP_ZOOM = 4.0;
export const MAP_ZOOM_STEP = 0.2;

export function clampMapZoom(value: number) {
  return Math.min(Math.max(value, MIN_MAP_ZOOM), MAX_MAP_ZOOM);
}
