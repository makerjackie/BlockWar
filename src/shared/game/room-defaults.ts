import { Room } from './types';

export function createDefaultRoom(roomId: string, roomName = 'Untitled') {
  switch (roomId) {
    case '1':
      return Room.create({
        id: '1',
        roomName: 'BlockWar Bot Room / 方块战争机器人房',
        keepAlive: true,
      });
    case 'warring_state':
      return Room.create({
        id: 'warring_state',
        roomName: '方块战争·战国模式 Warring State',
        warringStatesMode: true,
        revealKing: true,
        keepAlive: true,
      });
    default:
      return new Room(roomId, roomName);
  }
}

export const seedRoomIds = ['1', 'warring_state'];
