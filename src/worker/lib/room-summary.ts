import Player from '@shared/game/player';
import { createDefaultRoom } from '@shared/game/room-defaults';
import type { RoomPreset } from '@shared/game/room-presets';
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
  isBot?: boolean;
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
  generals: never[];
  mapId: string;
  mapName: string;
  keepAlive: boolean;
  revealKing: boolean;
  warringStatesMode: boolean;
  preset?: RoomPreset;
};

type SanitizeRoomSummaryOptions = {
  activeConnectionIds?: ReadonlySet<string>;
};

export function sanitizeRoomSummary(
  room: PlainRoom,
  options: SanitizeRoomSummaryOptions = {}
): PlainRoom {
  const players = (room.players ?? []).filter((player) => {
    if (player.isBot) {
      return true;
    }

    if (player.disconnected) {
      return false;
    }

    return options.activeConnectionIds
      ? options.activeConnectionIds.has(player.socket_id)
      : true;
  });
  const forceStartNum = players.reduce(
    (count, player) => count + (!player.isBot && player.forceStart ? 1 : 0),
    0
  );
  const hasPlayers = players.length > 0;

  return {
    ...room,
    preset: room.preset ?? 'standard',
    gameStarted: hasPlayers ? room.gameStarted : false,
    forceStartNum,
    mapGenerated: hasPlayers ? room.mapGenerated : false,
    globalMapDiff: null,
    gameRecord: null,
    map: null,
    gameLoop: null,
    players,
    generals: hasPlayers ? room.generals : [],
  };
}

export function cloneRoomSummary(room: Room): PlainRoom {
  return sanitizeRoomSummary({
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
      isBot: player.isBot,
    })),
    generals: [],
    mapId: room.mapId,
    mapName: room.mapName,
    keepAlive: room.keepAlive,
    revealKing: room.revealKing,
    warringStatesMode: room.warringStatesMode,
    preset: room.preset,
  });
}

export function hydrateRoomSummary(roomId: string, summary?: PlainRoom | null) {
  if (!summary) {
    return createDefaultRoom(roomId);
  }

  const sanitizedSummary = sanitizeRoomSummary(summary);

  const room = Room.create({
    id: sanitizedSummary.id,
    roomName: sanitizedSummary.roomName,
    gameStarted: false,
    mapGenerated: false,
    forceStartNum: 0,
    maxPlayers: sanitizedSummary.maxPlayers,
    gameSpeed: sanitizedSummary.gameSpeed,
    mapWidth: sanitizedSummary.mapWidth,
    mapHeight: sanitizedSummary.mapHeight,
    mountain: sanitizedSummary.mountain,
    city: sanitizedSummary.city,
    swamp: sanitizedSummary.swamp,
    fogOfWar: sanitizedSummary.fogOfWar,
    deathSpectator: sanitizedSummary.deathSpectator,
    globalMapDiff: null,
    gameRecord: null,
    map: null,
    gameLoop: null,
    generals: [],
    mapId: sanitizedSummary.mapId,
    mapName: sanitizedSummary.mapName,
    keepAlive: sanitizedSummary.keepAlive,
    revealKing: sanitizedSummary.revealKing,
    warringStatesMode: sanitizedSummary.warringStatesMode,
    preset: sanitizedSummary.preset ?? 'standard',
    players: [],
  });

  room.players = (sanitizedSummary.players ?? []).map(
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
        player.disconnected ?? false,
        player.isBot ?? false
      )
  );

  return room;
}
