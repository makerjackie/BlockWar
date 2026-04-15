import Player from '@shared/game/player';
import { createDefaultRoom } from '@shared/game/room-defaults';
import { Room } from '@shared/game/types';

export type PlainPlayer = {
  id: string;
  socket_id: string;
  username: string;
  color: number;
  team: number;
  isRoomHost?: boolean;
  forceStart?: boolean;
  isDead?: boolean;
  disconnected?: boolean;
};

export type PlainRoom = {
  id: string;
  roomName: string;
  gameStarted: boolean;
  forceStartNum: number;
  mapGenerated: boolean;
  maxPlayers: number;
  gameSpeed: number;
  mapWidth: number;
  mapHeight: number;
  mountain: number;
  city: number;
  swamp: number;
  fogOfWar: boolean;
  deathSpectator: boolean;
  globalMapDiff: null;
  gameRecord: null;
  map: null;
  gameLoop: null;
  players: PlainPlayer[];
  generals: unknown[];
  mapId: string;
  mapName: string;
  keepAlive: boolean;
  revealKing: boolean;
  warringStatesMode: boolean;
};

export function cloneRoomSummary(room: Room): PlainRoom {
  return {
    id: room.id,
    roomName: room.roomName,
    gameStarted: room.gameStarted,
    forceStartNum: room.forceStartNum,
    mapGenerated: room.mapGenerated,
    maxPlayers: room.maxPlayers,
    gameSpeed: room.gameSpeed,
    mapWidth: room.mapWidth,
    mapHeight: room.mapHeight,
    mountain: room.mountain,
    city: room.city,
    swamp: room.swamp,
    fogOfWar: room.fogOfWar,
    deathSpectator: room.deathSpectator,
    globalMapDiff: null,
    gameRecord: null,
    map: null,
    gameLoop: null,
    players: room.players.map((player) => ({
      id: player.id,
      socket_id: player.socket_id,
      username: player.username,
      color: player.color,
      team: player.team,
      isRoomHost: player.isRoomHost,
      forceStart: player.forceStart,
      isDead: player.isDead,
      disconnected: player.disconnected,
    })),
    generals: [],
    mapId: room.mapId,
    mapName: room.mapName,
    keepAlive: room.keepAlive,
    revealKing: room.revealKing,
    warringStatesMode: room.warringStatesMode,
  };
}

export function hydrateRoomSummary(roomId: string, summary?: PlainRoom | null) {
  if (!summary) {
    return createDefaultRoom(roomId);
  }

  const room = Room.create({
    id: summary.id,
    roomName: summary.roomName,
    gameStarted: false,
    mapGenerated: false,
    forceStartNum: 0,
    maxPlayers: summary.maxPlayers,
    gameSpeed: summary.gameSpeed,
    mapWidth: summary.mapWidth,
    mapHeight: summary.mapHeight,
    mountain: summary.mountain,
    city: summary.city,
    swamp: summary.swamp,
    fogOfWar: summary.fogOfWar,
    deathSpectator: summary.deathSpectator,
    globalMapDiff: null,
    gameRecord: null,
    map: null,
    gameLoop: null,
    generals: [],
    mapId: summary.mapId,
    mapName: summary.mapName,
    keepAlive: summary.keepAlive,
    revealKing: summary.revealKing,
    warringStatesMode: summary.warringStatesMode,
    players: [],
  });

  room.players = (summary.players ?? []).map(
    (player) =>
      new Player(
        player.id,
        player.socket_id,
        player.username,
        player.color,
        player.team,
        player.isRoomHost ?? false,
        player.forceStart ?? false,
        player.isDead ?? false,
        0,
        [],
        null,
        null,
        player.disconnected ?? false
      )
  );

  return room;
}
