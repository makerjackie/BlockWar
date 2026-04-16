import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import MapEditor from '@/components/game/MapEditor';

function createMatchMedia(viewportWidth: number) {
  return (query: string) => {
    const maxWidthMatch = /max-width:\s*(\d+)px/.exec(query);

    return {
      matches: maxWidthMatch ? viewportWidth <= Number(maxWidthMatch[1]) : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
  };
}

function renderEditor({ viewportWidth }: { viewportWidth?: number } = {}) {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

  if (viewportWidth !== undefined) {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        matchMedia: createMatchMedia(viewportWidth),
      },
    });
  }

  try {
    return renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/mapcreator'] },
        React.createElement(MapEditor, { editMode: true })
      )
    );
  } finally {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
    consoleError.mockRestore();
  }
}

describe('MapEditor responsive layout', () => {
  it('renders mobile-first desktop editor docks', () => {
    const html = renderEditor();

    expect(html).toContain('inset-x-2 top-[82px]');
    expect(html).toContain('flex-col');
    expect(html).toContain('order-3 min-w-[252px]');
    expect(html).toContain('order-2 grid w-[190px]');
    expect(html).toContain('auto-cols-[70px]');
    expect(html).toContain('h-[78px]');
    expect(html).toContain('bw-palette-selected');
  });

  it('renders compact editor controls on mobile screens', () => {
    const html = renderEditor({ viewportWidth: 390 });

    expect(html).toContain('inset-x-2 top-[82px]');
    expect(html).toContain('grid shrink-0 grid-cols-3 gap-2');
    expect(html).toContain('col-span-2 h-11 min-h-11');
    expect(html).toContain('grid grid-cols-2 gap-2');
    expect(html).toContain('bw-panel-hard flex h-12 min-h-12');
    expect(html).toContain('overflow-hidden px-2.5 py-2');
    expect(html).toContain('auto-cols-[70px]');
    expect(html).toContain('h-[78px]');
    expect(html).toContain('bw-palette-selected');
    expect(html).not.toContain('h-[188px]');
  });

  it('keeps desktop dock overrides alongside mobile styles', () => {
    const html = renderEditor();

    expect(html).toContain('md:right-0 md:top-[70px]');
    expect(html).toContain('md:w-[min(360px,88vw)]');
    expect(html).toContain('md:overflow-y-auto');
    expect(html).toContain('md:left-0');
    expect(html).toContain('md:w-[96px]');
  });
});
