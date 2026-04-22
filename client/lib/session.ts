const SESSION_STORAGE_KEY = 'blockwar_session_token';

type SessionResponse = {
  token: string;
  username: string;
};

function getSessionApiUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_API ?? '/api';
  return `${baseUrl}/session`;
}

export function readSessionToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY)?.trim() ?? '';
}

export function clearSessionToken() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function buildSessionHeaders(sessionToken: string) {
  return {
    'x-blockwar-session': sessionToken,
  };
}

export async function ensurePlayerSession(username: string) {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) {
    throw new Error('Username is required');
  }

  const currentToken = readSessionToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (currentToken) {
    headers['x-blockwar-session'] = currentToken;
  }

  const response = await fetch(getSessionApiUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: normalizedUsername,
    }),
  });

  if (!response.ok) {
    clearSessionToken();
    throw new Error('Failed to initialize player session');
  }

  const payload = (await response.json()) as SessionResponse;
  if (!payload.token) {
    clearSessionToken();
    throw new Error('Failed to initialize player session');
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_STORAGE_KEY, payload.token);
  }

  return payload.token;
}
