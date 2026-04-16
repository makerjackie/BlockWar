import { Room } from './types';
import {
  DEFAULT_ROOM_NAME,
  LEGACY_UNTITLED_ROOM_NAME,
} from './room-names';
import type { RoomPreset } from './room-presets';

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
        preset,
      });
    case 'tutorial':
      return Room.create({
        id: roomId,
        roomName:
          normalizedRoomName === LEGACY_UNTITLED_ROOM_NAME
            ? 'Tutorial'
            : normalizedRoomName,
        maxPlayers: 3,
        gameSpeed: 1,
        mapWidth: 0.25,
        mapHeight: 0.25,
        mountain: 0.2,
        city: 0.25,
        swamp: 0,
        fogOfWar: false,
        deathSpectator: true,
        revealKing: true,
        preset,
      });
    case 'standard':
    default:
      return Room.create({
        id: roomId,
        roomName: normalizedRoomName,
        preset,
      });
  }
}
