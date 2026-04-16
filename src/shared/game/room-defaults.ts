import { Room } from './types';
import {
  DEFAULT_ROOM_NAME,
  LEGACY_UNTITLED_ROOM_NAME,
} from './room-names';

export type RoomPreset = 'standard' | 'warring_state';

export const LEGACY_SEED_ROOM_IDS = ['1', 'warring_state'] as const;

export function createDefaultRoom(
  roomId: string,
  roomName = DEFAULT_ROOM_NAME,
  preset: RoomPreset = 'standard'
) {
  const normalizedRoomName = roomName.trim().length > 0 ? roomName : DEFAULT_ROOM_NAME;

  switch (preset) {
    case 'warring_state':
      return Room.create({
        id: roomId,
        roomName:
          normalizedRoomName === LEGACY_UNTITLED_ROOM_NAME
            ? 'Warring State'
            : normalizedRoomName,
        warringStatesMode: true,
        revealKing: true,
      });
    case 'standard':
    default:
      return new Room(roomId, normalizedRoomName);
  }
}
