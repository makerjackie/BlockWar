import { describe, expect, it } from 'vitest';
import { env, runInDurableObject } from 'cloudflare:test';
import { DEFAULT_ROOM_NAME, formatCreatorRoomName } from '@shared/game/room-names';
import Player from '@shared/game/player';
import Point from '@shared/game/point';
import { TileType } from '@shared/game/types';
import type { RoomDurableObject } from '../src/worker/room-do';
import { cloneRoomSummary } from '../src/worker/lib/room-summary';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Cloudflare.Env {}
}

type CapturedEvent = {
  connectionId: string;
  event: string;
  data: unknown[];
};

function captureEvents(instance: RoomDurableObject) {
  const events: CapturedEvent[] = [];
  (instance as any).send = (
    connectionId: string,
    event: string,
    ...data: unknown[]
  ) => {
    events.push({ connectionId, event, data });
  };
  (instance as any).broadcast = (event: string, ...data: unknown[]) => {
    events.push({ connectionId: '*', event, data });
  };
  return events;
}

async function createStartedRoom(instance: RoomDurableObject, roomId: string) {
  const events = captureEvents(instance);
  const room = await (instance as any).ensureRoom(roomId);
  room.players.push(
    new Player('player-a', 'socket-a', 'Alice', 1, 1),
    new Player('player-b', 'socket-b', 'Bob', 2, 2)
  );

  await (instance as any).syncRoomSummary();
  await (instance as any).startGame();
  (instance as any).clearGameLoop();
  events.length = 0;

  return { events, room };
}

describe('RoomDurableObject', () => {
  it('echoes application ping packets over the room socket', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'ping',
          data: ['ping-1'],
        });

        expect(events).toContainEqual({
          connectionId: 'socket-a',
          event: 'pong',
          data: ['ping-1'],
        });
      }
    );
  });

  it('starts a game and advances turns', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1),
          new Player('player-b', 'socket-b', 'Bob', 2, 2)
        );

        await (instance as any).syncRoomSummary();
        await (instance as any).startGame();

        expect(room.gameStarted).toBe(true);
        expect(room.map).toBeTruthy();
        expect(room.players.every((player: Player) => player.king)).toBe(true);

        const turnBefore = room.map.turn;
        await (instance as any).runGameTick();
        expect(room.map.turn).toBe(turnBefore + 1);

        (instance as any).clearGameLoop();
      }
    );
  });

  it('auto-surrenders inactive players and notifies their socket', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1),
          new Player('player-b', 'socket-b', 'Bob', 2, 2),
          new Player('player-c', 'socket-c', 'Carol', 3, 3)
        );

        await (instance as any).syncRoomSummary();
        await (instance as any).startGame();
        (instance as any).clearGameLoop();
        events.length = 0;

        const inactivePlayer = room.players[0];
        room.players[1].operatedTurn = 1;
        room.players[2].operatedTurn = 1;
        inactivePlayer.operatedTurn = 0;
        inactivePlayer.disconnected = false;
        inactivePlayer.isDead = false;

        expect(inactivePlayer.king).toBeTruthy();
        expect(room.map!.getBlock(inactivePlayer.king!).player).toBe(inactivePlayer);

        room.map!.turn = 161;

        await (instance as any).runGameTick();

        expect(inactivePlayer.isDead).toBe(true);
        expect(
          events.some(
            (item) =>
              item.connectionId === 'socket-a' &&
              item.event === 'auto_surrendered'
          )
        ).toBe(true);
        expect(
          events.some(
            (item) =>
              item.event === 'room_message' &&
              item.data[0] &&
              (item.data[0] as { username?: string }).username === 'Alice' &&
              item.data[1] === 'surrendered'
          )
        ).toBe(true);
      }
    );
  });

  it('lets a room host add a bot and start a bot match', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });

        expect(room.players).toHaveLength(2);
        expect(room.players[1].isBot).toBe(true);
        expect(events.some((item) => item.event === 'update_room')).toBe(true);

        await (instance as any).handlePacket('socket-a', {
          type: 'force_start',
          data: [],
        });

        expect(room.gameStarted).toBe(true);
        expect(room.players.every((player: Player) => player.king)).toBe(true);

        (instance as any).clearGameLoop();
      }
    );
  });

  it('starts tutorial rooms through a single tutorial packet', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.preset = 'tutorial';
        room.maxPlayers = 3;
        room.fogOfWar = false;
        room.revealKing = true;
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'start_tutorial',
          data: [],
        });

        expect(room.players.filter((player: Player) => player.isBot)).toHaveLength(2);
        expect(room.gameStarted).toBe(true);
        expect(room.forceStartNum).toBe(1);

        (instance as any).clearGameLoop();
      }
    );
  });

  it('moves a bot forward after a few real game ticks', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });
        await (instance as any).handlePacket('socket-a', {
          type: 'force_start',
          data: [],
        });
        (instance as any).clearGameLoop();

        const bot = room.players.find((player: Player) => player.isBot);
        expect(bot).toBeTruthy();

        const botKing = bot!.king!;
        const adjacentPoints = [
          new Point(botKing.x - 1, botKing.y),
          new Point(botKing.x + 1, botKing.y),
          new Point(botKing.x, botKing.y - 1),
          new Point(botKing.x, botKing.y + 1),
        ].filter((point) => {
          return (
            room.map!.withinMap(point) &&
            !room.players.some((player: Player) => {
              return player.king?.x === point.x && player.king?.y === point.y;
            })
          );
        });
        const neighbor = adjacentPoints[0];
        expect(neighbor).toBeTruthy();

        const kingBlock = room.map!.getBlock(botKing);
        const neighborBlock = room.map!.getBlock(neighbor!);
        for (const point of adjacentPoints.slice(1)) {
          const block = room.map!.getBlock(point);
          if (block.player) {
            block.player.loseLand(block);
          }
          block.beNeutralized();
          block.setType(TileType.Mountain);
          block.setUnit(0);
        }
        if (neighborBlock.player) {
          neighborBlock.player.loseLand(neighborBlock);
        }
        neighborBlock.beNeutralized();
        neighborBlock.setType(TileType.Plain);
        neighborBlock.setUnit(0);
        kingBlock.setUnit(8);

        for (let index = 0; index < 3; index += 1) {
          await (instance as any).runGameTick();
        }

        expect(bot!.operatedTurn).toBeGreaterThan(0);
        expect(neighborBlock.player).toBe(bot);
        (instance as any).clearGameLoop();
      }
    );
  });

  it('deletes bot-only rooms after the last human leaves', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).syncRoomSummary();
        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });
        await (instance as any).handleDisconnect('socket-a');

        expect(await (instance as any).app.getRoom(roomId)).toBeNull();
      }
    );
  });

  it('rehydrates persisted room state before handling hibernated websocket messages', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));
        await (instance as any).syncRoomSummary();

        (instance as any).room = null;
        (instance as any).sockets.set('socket-a', {
          readyState: WebSocket.OPEN,
        });

        await instance.webSocketMessage(
          {
            deserializeAttachment: () => ({
              connectionId: 'socket-a',
              roomId,
              playerId: 'player-a',
            }),
          } as WebSocket,
          JSON.stringify({ type: 'get_room_info', data: [] })
        );

        expect(events.some((item) => item.event === 'update_room')).toBe(true);
        expect((instance as any).room.players[0].id).toBe('player-a');
      }
    );
  });

  it('does not allow a player to surrender another player', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);

        await (instance as any).handlePacket('socket-a', {
          type: 'surrender',
          data: ['player-b'],
        });

        expect(room.players[1].isDead).toBe(false);
        expect(events.some((item) => item.event === 'error')).toBe(true);
      }
    );
  });

  it('rejects malformed and diagonal attacks', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        const player = room.players[0];
        const map = room.map!;
        map.turn = 1;
        const malformedRequestId = 'req-malformed';
        const diagonalRequestId = 'req-diagonal';

        await (instance as any).handlePacket('socket-a', {
          type: 'attack',
          data: [null, { x: 0, y: 0 }, 'false', malformedRequestId],
        });

        const from = { x: player.king!.x, y: player.king!.y };
        const to = {
          x: from.x < map.width - 1 ? from.x + 1 : from.x - 1,
          y: from.y < map.height - 1 ? from.y + 1 : from.y - 1,
        };

        await (instance as any).handlePacket('socket-a', {
          type: 'attack',
          data: [from, to, false, diagonalRequestId],
        });

        const attackFailures = events.filter((item) => item.event === 'attack_failure');
        expect(attackFailures).toHaveLength(2);
        expect(events.some((item) => item.event === 'attack_success')).toBe(false);
        expect(player.operatedTurn).toBe(0);
        expect(attackFailures[0].data[3]).toBe(malformedRequestId);
        expect(attackFailures[1].data[3]).toBe(diagonalRequestId);
      }
    );
  });

  it('echoes the client request id for successful attacks', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        const player = room.players[0];
        const map = room.map!;
        map.turn = 1;

        const from = { x: player.king!.x, y: player.king!.y };
        const candidateTargets = [
          { x: from.x - 1, y: from.y },
          { x: from.x + 1, y: from.y },
          { x: from.x, y: from.y - 1 },
          { x: from.x, y: from.y + 1 },
        ];
        const to = candidateTargets.find((point) => {
          return (
            point.x >= 0 &&
            point.x < map.width &&
            point.y >= 0 &&
            point.y < map.height &&
            map.commendable(player, from, point)
          );
        });

        expect(to).toBeTruthy();

        await (instance as any).handlePacket('socket-a', {
          type: 'attack',
          data: [from, to, false, 'req-success'],
        });

        const attackSuccess = events.find((item) => item.event === 'attack_success');
        expect(attackSuccess?.data[0]).toEqual(from);
        expect(attackSuccess?.data[1]).toEqual(to);
        expect(attackSuccess?.data[3]).toBe('req-success');
      }
    );
  });

  it('ends and cleans up games with no remaining alive teams', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);

        for (const player of room.players) {
          (instance as any).handleNeutralized(room, player);
        }

        await (instance as any).runGameTick();

        expect(room.gameStarted).toBe(false);
        expect(room.forceStartNum).toBe(0);
        expect(
          events.some(
            (item) => item.event === 'game_ended' && Array.isArray(item.data[0])
          )
        ).toBe(true);
      }
    );
  });

  it('keeps a started room alive during disconnect grace', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { room } = await createStartedRoom(instance, roomId);

        await (instance as any).handleDisconnect('socket-a');
        await (instance as any).handleDisconnect('socket-b');

        expect(room.gameStarted).toBe(true);
        expect(room.players).toHaveLength(2);
        expect(room.players.every((player: Player) => player.disconnected)).toBe(
          true
        );
      }
    );
  });

  it('lets an in-game player reconnect before the disconnect grace expires', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        const player = room.players[0];
        const reconnectToken = await (instance as any).app.issueReconnectToken(
          'session-a',
          roomId,
          player.id
        );
        const originalLandCount = player.land.length;

        await (instance as any).handleDisconnect('socket-a');
        expect(player.disconnected).toBe(true);
        expect(player.isDead).toBe(false);
        expect(player.land).toHaveLength(originalLandCount);

        await (instance as any).handleJoin(
          'socket-a-reconnected',
          roomId,
          'Alice',
          'session-a',
          reconnectToken
        );

        expect(player.disconnected).toBe(false);
        expect(player.socket_id).toBe('socket-a-reconnected');
        expect(room.gameStarted).toBe(true);
        expect(
          events.some(
            (item) =>
              item.event === 'room_message' &&
              item.data[0] &&
              (item.data[0] as { username?: string }).username === 'Alice' &&
              item.data[1] === 'reconnected.'
          )
        ).toBe(true);
      }
    );
  });

  it('neutralizes an in-game player after the disconnect grace expires', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        const player = room.players[0];

        await (instance as any).handleDisconnect('socket-a');
        await (instance as any).expireDisconnectedPlayer(player.id);

        expect(player.disconnected).toBe(true);
        expect(player.isDead).toBe(true);
        expect(player.land).toHaveLength(0);
        expect(
          events.some(
            (item) =>
              item.event === 'room_message' &&
              item.data[0] &&
              (item.data[0] as { username?: string }).username === 'Alice' &&
              item.data[1] === 'timed out.'
          )
        ).toBe(true);
      }
    );
  });

  it('prunes stale full room summaries before accepting a direct join', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const staleRoom = await (instance as any).ensureRoom(roomId);
        staleRoom.maxPlayers = 2;
        staleRoom.players.push(
          new Player('player-a', 'stale-socket-a', 'Alice', 1, 1),
          new Player('player-b', 'stale-socket-b', 'Bob', 2, 2)
        );
        await (instance as any).app.upsertRoom(cloneRoomSummary(staleRoom));
        (instance as any).room = null;

        await (instance as any).handleJoin(
          'socket-c',
          roomId,
          'Carol',
          'session-c',
          ''
        );

        const room = (instance as any).room;
        expect(room.players).toHaveLength(1);
        expect(room.players[0].username).toBe('Carol');
        expect(events.some((item) => item.event === 'reject_join')).toBe(false);
      }
    );
  });

  it('replaces fallback room titles with the first host name on join', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.roomName = DEFAULT_ROOM_NAME;

        await (instance as any).handleJoin(
          'socket-a',
          roomId,
          'Alice',
          'session-a',
          ''
        );

        expect(room.roomName).toBe(formatCreatorRoomName('Alice'));
        expect(room.players[0]?.isRoomHost).toBe(true);
      }
    );
  });

  it('rejects unsafe room setting keys', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'change_room_setting',
          data: ['players', []],
        });

        expect(room.players).toHaveLength(1);
        expect(events.some((item) => item.event === 'error')).toBe(true);
      }
    );
  });

  it('keeps the transferred host when another player disconnects', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1, true),
          new Player('player-b', 'socket-b', 'Bob', 2, 2),
          new Player('player-c', 'socket-c', 'Carol', 3, 3)
        );

        await (instance as any).handlePacket('socket-a', {
          type: 'change_host',
          data: ['player-b'],
        });
        await (instance as any).handleDisconnect('socket-c');

        expect(room.players.find((player: Player) => player.id === 'player-b')?.isRoomHost).toBe(true);
        expect(room.players.find((player: Player) => player.id === 'player-a')?.isRoomHost).toBe(false);
      }
    );
  });

  it('reassigns the host when the current host disconnects', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1, true),
          new Player('player-b', 'socket-b', 'Bob', 2, 2),
          new Player('player-c', 'socket-c', 'Carol', 3, 3)
        );

        await (instance as any).handleDisconnect('socket-a');

        expect(room.players.find((player: Player) => player.id === 'player-b')?.isRoomHost).toBe(true);
        expect(room.players.some((player: Player) => player.id === 'player-a')).toBe(false);
        expect(
          events.some(
            (item) =>
              item.event === 'host_reassigned' &&
              (item.data[0] as { username?: string })?.username === 'Alice' &&
              (item.data[1] as { username?: string })?.username === 'Bob'
          )
        ).toBe(true);
      }
    );
  });

  it('removes a lobby player immediately when they leave the room explicitly', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1, true),
          new Player('player-b', 'socket-b', 'Bob', 2, 2)
        );
        (instance as any).sockets.set('socket-b', {
          close: () => undefined,
        });

        await (instance as any).handlePacket('socket-b', {
          type: 'leave_room',
          data: [],
        });

        expect(room.players.map((player: Player) => player.id)).toEqual(['player-a']);
        expect(
          events.some(
            (item) =>
              item.event === 'room_message' &&
              item.data[0] &&
              (item.data[0] as { username?: string }).username === 'Bob' &&
              item.data[1] === 'left the room.'
          )
        ).toBe(true);
        expect(
          events.some(
            (item) =>
              item.event === 'update_room' &&
              ((item.data[0] as { players?: Array<{ id: string }> }).players ?? []).length === 1
          )
        ).toBe(true);
      }
    );
  });

  it('marks an in-game player as disconnected when they leave explicitly', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        (instance as any).sockets.set('socket-a', {
          close: () => undefined,
        });

        await (instance as any).handlePacket('socket-a', {
          type: 'leave_room',
          data: [],
        });

        expect(room.players.find((player: Player) => player.id === 'player-a')?.disconnected).toBe(
          true
        );
        expect(
          events.some(
            (item) =>
              item.event === 'room_message' &&
              item.data[0] &&
              (item.data[0] as { username?: string }).username === 'Alice' &&
              item.data[1] === 'disconnected.'
          )
        ).toBe(true);
      }
    );
  });

  it('ignores the follow-up socket close after an explicit in-game leave', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const { events, room } = await createStartedRoom(instance, roomId);
        (instance as any).sockets.set('socket-a', {
          close: () => undefined,
        });

        await (instance as any).handlePacket('socket-a', {
          type: 'leave_room',
          data: [],
        });
        await (instance as any).handleDisconnect('socket-a');

        expect(room.players.find((player: Player) => player.id === 'player-a')?.disconnected).toBe(
          true
        );
        expect(
          events.filter(
            (item) =>
              item.event === 'room_message' &&
              item.data[0] &&
              (item.data[0] as { username?: string }).username === 'Alice' &&
              item.data[1] === 'disconnected.'
          )
        ).toHaveLength(1);
      }
    );
  });

  it('lets the host move a bot onto the same team as another player', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(new Player('player-a', 'socket-a', 'Alice', 1, 1, true));

        await (instance as any).handlePacket('socket-a', {
          type: 'add_bot',
          data: [],
        });

        const bot = room.players.find((player: Player) => player.isBot);
        expect(bot).toBeTruthy();

        await (instance as any).handlePacket('socket-a', {
          type: 'set_player_team',
          data: [bot!.id, 1],
        });

        expect(bot!.team).toBe(1);
      }
    );
  });

  it('lets the host kick a human player before the game starts', async () => {
    const roomId = `room-${crypto.randomUUID().slice(0, 8)}`;
    const stub = env.ROOMS.getByName(roomId);

    await runInDurableObject(
      stub,
      async (instance: RoomDurableObject) => {
        const events = captureEvents(instance);
        const room = await (instance as any).ensureRoom(roomId);
        room.players.push(
          new Player('player-a', 'socket-a', 'Alice', 1, 1, true),
          new Player('player-b', 'socket-b', 'Bob', 2, 2)
        );
        (instance as any).sockets.set('socket-b', {
          readyState: WebSocket.OPEN,
          close: () => undefined,
        });

        await (instance as any).handlePacket('socket-a', {
          type: 'kick_player',
          data: ['player-b'],
        });

        expect(room.players.map((player: Player) => player.id)).toEqual(['player-a']);
        expect(
          events.some(
            (item) =>
              item.connectionId === 'socket-b' &&
              item.event === 'kicked'
          )
        ).toBe(true);
      }
    );
  });
});
