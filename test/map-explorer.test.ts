import { describe, expect, it } from 'vitest';
import {
  buildMapExplorerRequestUrl,
  normalizeMapExplorerResponse,
} from '@/lib/map-explorer';

describe('map explorer helpers', () => {
  it('skips search requests when the search term is blank', () => {
    expect(buildMapExplorerRequestUrl('/api', 'search', '')).toBeNull();
    expect(buildMapExplorerRequestUrl('/api', 'search', '   ')).toBeNull();
  });

  it('builds list and search request URLs from normalized input', () => {
    expect(buildMapExplorerRequestUrl('/api', 'hot', '')).toBe('/api/hot');
    expect(buildMapExplorerRequestUrl('/api', 'search', '  map id  ')).toBe(
      '/api/search?q=map%20id'
    );
  });

  it('normalizes non-array API payloads into empty lists', () => {
    expect(normalizeMapExplorerResponse({ error: 'Invalid query parameter' })).toEqual([]);
    expect(normalizeMapExplorerResponse('bad response')).toEqual([]);
  });
});
