import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import MapTile from '@/components/game/MapTile';
import { TileProp, TileType } from '@/lib/types';

function renderMapTile(overrides: Partial<React.ComponentProps<typeof MapTile>> = {}) {
  return renderToStaticMarkup(
    React.createElement(MapTile, {
      size: 32,
      x: 4,
      y: 7,
      tile: [TileType.King, 1, 40] as TileProp,
      isOwned: true,
      _className: '',
      tileHalf: false,
      isSelected: false,
      isNextPossibleMove: false,
      isMyKing: false,
      warringStatesMode: false,
      ...overrides,
    })
  );
}

describe('MapTile own king highlight', () => {
  it('renders a dedicated badge and ring for the player king', () => {
    const html = renderMapTile({ isMyKing: true });

    expect(html).toContain('data-highlight="my-king-glow"');
    expect(html).toContain('data-highlight="my-king-ring"');
    expect(html).toContain('data-highlight="my-king-badge"');
  });

  it('keeps ordinary tiles free of the own-king marker', () => {
    const html = renderMapTile({
      tile: [TileType.City, 1, 40] as TileProp,
      isMyKing: false,
    });

    expect(html).not.toContain('data-highlight="my-king-glow"');
    expect(html).not.toContain('data-highlight="my-king-badge"');
  });
});
