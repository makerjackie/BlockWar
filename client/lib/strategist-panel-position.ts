export const STRATEGIST_PANEL_POSITION_KEY =
  'blockwar-strategist-panel-position-v2';

export interface StrategistPanelPosition {
  x: number;
  y: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface PanelSize {
  width: number;
  height: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const EDGE_MARGIN = 8;
const MOBILE_TOP_OFFSET = 72;
const DESKTOP_TOP_OFFSET = 24;

function roundPosition(position: StrategistPanelPosition): StrategistPanelPosition {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

export function clampStrategistPanelPosition(
  position: StrategistPanelPosition,
  viewport: ViewportSize,
  panel: PanelSize
): StrategistPanelPosition {
  const maxX = Math.max(EDGE_MARGIN, viewport.width - panel.width - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, viewport.height - panel.height - EDGE_MARGIN);
  const rounded = roundPosition(position);

  return {
    x: Math.min(Math.max(rounded.x, EDGE_MARGIN), maxX),
    y: Math.min(Math.max(rounded.y, EDGE_MARGIN), maxY),
  };
}

export function getDefaultStrategistPanelPosition(
  viewport: ViewportSize,
  panel: PanelSize,
  isMobile: boolean
): StrategistPanelPosition {
  return clampStrategistPanelPosition(
    {
      x: (viewport.width - panel.width) / 2,
      y: isMobile ? MOBILE_TOP_OFFSET : DESKTOP_TOP_OFFSET,
    },
    viewport,
    panel
  );
}

export function readStrategistPanelPosition(
  storage: StorageLike | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage
): StrategistPanelPosition | null {
  const rawValue = storage?.getItem(STRATEGIST_PANEL_POSITION_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StrategistPanelPosition>;
    if (
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y)
    ) {
      return roundPosition({ x: parsed.x, y: parsed.y });
    }
  } catch {
    return null;
  }

  return null;
}

export function writeStrategistPanelPosition(
  position: StrategistPanelPosition,
  storage: StorageLike | undefined =
    typeof window === 'undefined' ? undefined : window.localStorage
) {
  storage?.setItem(
    STRATEGIST_PANEL_POSITION_KEY,
    JSON.stringify(roundPosition(position))
  );
}
