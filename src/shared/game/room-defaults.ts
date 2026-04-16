import { Room } from './types';

export type RoomPreset = 'standard' | 'warring_state';

export const LEGACY_SEED_ROOM_IDS = ['1', 'warring_state'] as const;

export function createDefaultRoom(
  roomId: string,
  roomName = 'Untitled',
  preset: RoomPreset = 'standard'
) {
  switch (preset) {
    case 'warring_state':
      return Room.create({
        id: roomId,
        roomName: roomName === 'Untitled' ? 'Warring State' : roomName,
        warringStatesMode: true,
        revealKing: true,
      });
    case 'standard':
    default:
      return new Room(roomId, roomName);
  }
}
