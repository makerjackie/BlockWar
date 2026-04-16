export const MAX_ROOM_NAME_LENGTH = 20;
export const DEFAULT_ROOM_CREATOR = '玩家';
export const DEFAULT_ROOM_NAME = '【玩家】的房间';
export const LEGACY_UNTITLED_ROOM_NAME = 'Untitled';

const ROOM_NAME_PREFIX = '【';
const ROOM_NAME_SUFFIX = '】的房间';
const UNSAFE_ROOM_NAME_CHARS = /[<>&"'`]/g;

function truncateByCodeUnits(value: string, maxLength: number) {
  let result = '';

  for (const character of value) {
    if (result.length + character.length > maxLength) {
      break;
    }
    result += character;
  }

  return result;
}

export function sanitizeRoomCreatorName(value: string | null | undefined) {
  const sanitized = (value ?? DEFAULT_ROOM_CREATOR).trim().replace(UNSAFE_ROOM_NAME_CHARS, '');
  return sanitized.length > 0 ? sanitized : DEFAULT_ROOM_CREATOR;
}

export function formatCreatorRoomName(creatorName?: string | null) {
  const maxCreatorLength =
    MAX_ROOM_NAME_LENGTH - ROOM_NAME_PREFIX.length - ROOM_NAME_SUFFIX.length;
  const normalizedCreator = truncateByCodeUnits(
    sanitizeRoomCreatorName(creatorName),
    maxCreatorLength
  );

  return `${ROOM_NAME_PREFIX}${normalizedCreator}${ROOM_NAME_SUFFIX}`;
}

export function resolveRoomName(
  roomName?: string | null,
  creatorName?: string | null
) {
  if ((roomName ?? '').trim().length > 0) {
    return roomName!;
  }

  return formatCreatorRoomName(creatorName);
}

export function isFallbackRoomName(roomName?: string | null) {
  const normalizedRoomName = (roomName ?? '').trim();
  return (
    normalizedRoomName.length === 0 ||
    normalizedRoomName === LEGACY_UNTITLED_ROOM_NAME ||
    normalizedRoomName === DEFAULT_ROOM_NAME
  );
}
