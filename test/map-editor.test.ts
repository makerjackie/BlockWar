import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import MapEditor from '@/components/game/MapEditor';

function renderEditor() {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

  try {
    return renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/mapcreator'] },
        React.createElement(MapEditor, { editMode: true })
      )
    );
  } finally {
    consoleError.mockRestore();
  }
}

describe('MapEditor responsive layout', () => {
  it('renders mobile-first editor docks', () => {
    const html = renderEditor();

    expect(html).toContain('inset-x-2 top-[82px]');
    expect(html).toContain('h-[26dvh]');
    expect(html).toContain('max-h-[198px]');
    expect(html).toContain('flex-row');
    expect(html).toContain('overflow-x-auto overflow-y-hidden');
    expect(html).toContain('grid-flow-col');
    expect(html).toContain('auto-cols-[70px]');
    expect(html).toContain('h-[78px]');
    expect(html).toContain('bw-palette-selected');
  });

  it('keeps desktop dock overrides alongside mobile styles', () => {
    const html = renderEditor();

    expect(html).toContain('md:right-0 md:top-[70px]');
    expect(html).toContain('md:w-[min(360px,88vw)]');
    expect(html).toContain('md:flex-col');
    expect(html).toContain('md:left-0');
    expect(html).toContain('md:w-[96px]');
  });
});
