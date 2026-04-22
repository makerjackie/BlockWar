import type { CustomMapInfo } from '@/lib/types';

export type MapExplorerEndpoint = 'new' | 'hot' | 'best' | 'search';

export function buildMapExplorerRequestUrl(
  baseApiUrl: string,
  endpoint: MapExplorerEndpoint,
  searchTerm: string
) {
  if (endpoint !== 'search') {
    return `${baseApiUrl}/${endpoint}`;
  }

  const normalizedSearchTerm = searchTerm.trim();
  if (!normalizedSearchTerm) {
    return null;
  }

  return `${baseApiUrl}/search?q=${encodeURIComponent(normalizedSearchTerm)}`;
}

export function normalizeMapExplorerResponse(payload: unknown): CustomMapInfo[] {
  return Array.isArray(payload) ? (payload as CustomMapInfo[]) : [];
}
