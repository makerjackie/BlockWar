import { describe, expect, it } from 'vitest';
import {
  clampStrategistPanelPosition,
  getDefaultStrategistPanelPosition,
  readStrategistPanelPosition,
  writeStrategistPanelPosition,
} from '@/lib/strategist-panel-position';

describe('strategist panel position helpers', () => {
  it('centers the default position near the top edge', () => {
    expect(
      getDefaultStrategistPanelPosition(
        { width: 1200, height: 800 },
        { width: 320, height: 96 },
        false
      )
    ).toEqual({
      x: 440,
      y: 16,
    });

    expect(
      getDefaultStrategistPanelPosition(
        { width: 390, height: 844 },
        { width: 280, height: 96 },
        true
      )
    ).toEqual({
      x: 55,
      y: 64,
    });
  });

  it('clamps dragged positions inside the viewport', () => {
    expect(
      clampStrategistPanelPosition(
        { x: -40, y: -12 },
        { width: 900, height: 600 },
        { width: 280, height: 100 }
      )
    ).toEqual({
      x: 8,
      y: 8,
    });

    expect(
      clampStrategistPanelPosition(
        { x: 880, y: 590 },
        { width: 900, height: 600 },
        { width: 280, height: 100 }
      )
    ).toEqual({
      x: 612,
      y: 492,
    });
  });

  it('reads and writes rounded persisted positions', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        values.set(key, value);
      },
    };

    writeStrategistPanelPosition({ x: 182.8, y: 44.2 }, storage);

    expect(readStrategistPanelPosition(storage)).toEqual({
      x: 183,
      y: 44,
    });
  });

  it('ignores malformed persisted values', () => {
    const storage = {
      getItem() {
        return '{"x":"oops","y":20}';
      },
      setItem() {},
    };

    expect(readStrategistPanelPosition(storage)).toBeNull();
  });
});
