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
      showMyKingHighlight: false,
      warringStatesMode: false,
      ...overrides,
    })
  );
}

describe('MapTile own king highlight', () => {
  it('renders a light start-of-match cue for the player king', () => {
    const html = renderMapTile({ showMyKingHighlight: true });

    expect(html).toContain('data-highlight="my-king-outline"');
    expect(html).toContain('data-highlight="my-king-badge"');
  });

  it('keeps the marker hidden when the start hint is off', () => {
    const html = renderMapTile({
      showMyKingHighlight: false,
    });

    expect(html).not.toContain('data-highlight="my-king-outline"');
    expect(html).not.toContain('data-highlight="my-king-badge"');
  });
});
