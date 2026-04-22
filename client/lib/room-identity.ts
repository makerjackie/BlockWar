const MAX_USERNAME_LENGTH = 20;

function sanitizeUsername(value: string | null | undefined) {
  return (value ?? '').trim().slice(0, MAX_USERNAME_LENGTH);
}

export function resolveRoomIdentity(
  storedUsername: string | null,
  storedPlayerId: string | null
) {
  const username = sanitizeUsername(storedUsername);

  return {
    username,
    playerId: username ? (storedPlayerId ?? '').trim() : '',
    requiresUsername: username.length === 0,
  };
}
