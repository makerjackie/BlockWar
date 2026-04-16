import { describe, expect, it } from 'vitest';
import GameMap from '@shared/game/map';
import Player from '@shared/game/player';
import Point from '@shared/game/point';
import {
  Room,
  TileType,
  type CustomMapData,
  type CustomMapTileData,
} from '@shared/game/types';
import {
  BOT_SEARCH_LIMITS,
  createBotPlayer,
  planBotMove,
} from '../src/worker/lib/bot-engine';

function createScenario(options?: {
  width?: number;
  height?: number;
  botKing?: Point;
  enemyKing?: Point;
}) {
  const width = options?.width ?? 6;
  const height = options?.height ?? 6;
  const botKing = options?.botKing ?? new Point(0, 0);
  const enemyKing = options?.enemyKing ?? new Point(width - 1, height - 1);

  const bot = new Player(
    'bot-player',
    'bot:player',
    'Bot 1',
    1,
    1,
    false,
    false,
    false,
    0,
    [],
    null,
    null,
    false,
    true
  );
  const enemy = new Player('enemy-player', 'socket-enemy', 'Enemy', 2, 2);
  const room = new Room('bot-room');
  room.players = [bot, enemy];
  room.map = createTestMap(width, height, room.players, botKing, enemyKing);
  room.gameStarted = true;

  return { room, bot, enemy };
}

function createTestMap(
  width: number,
  height: number,
  players: Player[],
  botKing: Point,
  enemyKing: Point
) {
  const mapTilesData = Array.from({ length: width }, () =>
    Array.from({ length: height }, () => [TileType.Plain, null, 0, false, 0] as CustomMapTileData)
  );

  mapTilesData[botKing.x][botKing.y] = [TileType.King, null, 1, false, 0];
  mapTilesData[enemyKing.x][enemyKing.y] = [TileType.King, null, 1, false, 1];

  const mapData: CustomMapData = {
    id: 'bot-map',
    name: 'Bot Map',
    width,
    height,
    creator: 'tester',
    description: 'Bot logic test map',
    mapTilesData,
  };

  return GameMap.from_custom_map(mapData, players, false);
}

function assignOwnedBlock(
  room: Room,
  player: Player,
  point: Point,
  unit: number,
  type: TileType = TileType.Plain
) {
  const block = room.map!.getBlock(point);
  if (block.player && block.player !== player) {
    block.player.loseLand(block);
  }
  if (block.player !== player) {
    player.winLand(block);
  } else if (!player.land.includes(block)) {
    player.winLand(block);
  }

  block.setType(type);
  block.setUnit(unit);
}

describe('bot-engine', () => {
  it('creates unique bot names for the same room', () => {
    const room = new Room('room');
    room.players = [
      new Player(
        'bot-1',
        'bot:1',
        'Bot 1',
        1,
        1,
        false,
        false,
        false,
        0,
        [],
        null,
        null,
        false,
        true
      ),
    ];

    const bot = createBotPlayer({
      room,
      botId: 'bot-2',
      color: 2,
      team: 2,
    });

    expect(bot.username).toBe('Bot 2');
    expect(bot.isBot).toBe(true);
  });

  it('captures an adjacent enemy king before expanding', () => {
    const { room, bot } = createScenario({
      botKing: new Point(0, 0),
      enemyKing: new Point(1, 2),
    });

    assignOwnedBlock(room, bot, new Point(1, 1), 12);
    room.map!.getBlock(new Point(1, 2)).setUnit(2);

    const decision = planBotMove(room, bot);

    expect(decision).toMatchObject({
      from: { x: 1, y: 1 },
      to: { x: 1, y: 2 },
      reason: 'capture_king',
    });
  });

  it('reinforces its king when an adjacent enemy threatens it', () => {
    const { room, bot, enemy } = createScenario({
      botKing: new Point(1, 1),
      enemyKing: new Point(4, 4),
    });

    assignOwnedBlock(room, bot, new Point(1, 2), 9);
    assignOwnedBlock(room, enemy, new Point(2, 1), 8);
    room.map!.getBlock(new Point(1, 1)).setUnit(1);

    const decision = planBotMove(room, bot);

    expect(decision).toMatchObject({
      from: { x: 1, y: 2 },
      to: { x: 1, y: 1 },
      reason: 'defend_king',
    });
  });

  it('keeps planning work within the configured scan budget', () => {
    const { room, bot } = createScenario({
      width: 16,
      height: 16,
      botKing: new Point(0, 0),
      enemyKing: new Point(15, 15),
    });

    for (let x = 0; x < 9; x++) {
      for (let y = 0; y < 9; y++) {
        if (x === 0 && y === 0) {
          room.map!.getBlock(new Point(0, 0)).setUnit(15);
          continue;
        }
        assignOwnedBlock(room, bot, new Point(x, y), 6);
      }
    }

    const decision = planBotMove(room, bot);

    expect(decision).not.toBeNull();
    expect(decision!.inspectedOrigins).toBeLessThanOrEqual(BOT_SEARCH_LIMITS.origins);
    expect(decision!.evaluatedMoves).toBeLessThanOrEqual(
      BOT_SEARCH_LIMITS.origins * 4 * (BOT_SEARCH_LIMITS.targets + 1)
    );
  });
});
