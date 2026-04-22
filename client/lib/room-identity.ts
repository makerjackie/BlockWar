const MAX_USERNAME_LENGTH = 20;
const ROOM_RECONNECT_STORAGE_KEY = 'blockwar_room_reconnect_tokens';

function sanitizeUsername(value: string | null | undefined) {
  return (value ?? '').trim().slice(0, MAX_USERNAME_LENGTH);
}

function readReconnectTokenMap() {
  if (typeof window === 'undefined') {
    return {} as Record<string, string>;
  }

  try {
    const raw = window.localStorage.getItem(ROOM_RECONNECT_STORAGE_KEY);
    if (!raw) {
      return {} as Record<string, string>;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([roomId, token]) => typeof roomId === 'string' && typeof token === 'string'
      )
    );
  } catch {
    return {} as Record<string, string>;
  }
}

function writeReconnectTokenMap(tokens: Record<string, string>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ROOM_RECONNECT_STORAGE_KEY, JSON.stringify(tokens));
}

export function resolveRoomIdentity(storedUsername: string | null) {
  const username = sanitizeUsername(storedUsername);

  return {
    username,
    requiresUsername: username.length === 0,
  };
}

export function getStoredReconnectToken(roomId: string) {
  return readReconnectTokenMap()[roomId] ?? '';
}

export function storeReconnectToken(roomId: string, token: string) {
  const nextTokens = readReconnectTokenMap();
  if (token) {
    nextTokens[roomId] = token;
  } else {
    delete nextTokens[roomId];
  }
  writeReconnectTokenMap(nextTokens);
}

export function clearReconnectToken(roomId: string) {
  const nextTokens = readReconnectTokenMap();
  delete nextTokens[roomId];
  writeReconnectTokenMap(nextTokens);
}
